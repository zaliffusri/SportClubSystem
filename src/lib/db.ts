import { createPool } from "@vercel/postgres";
import { neon } from "@neondatabase/serverless";

const connectionString =
  process.env.POSTGRES_URL || process.env.DATABASE_URL;

type SqlTag = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;

let sql: SqlTag;

if (connectionString) {
  if (process.env.DATABASE_URL) {
    const neonQuery = neon(connectionString, { fullResults: true });
    sql = neonQuery as unknown as SqlTag;
  } else {
    const pool = createPool({ connectionString });
    sql = pool.sql.bind(pool) as unknown as SqlTag;
  }
} else {
  sql = (() => {
    throw new Error("POSTGRES_URL or DATABASE_URL is not set.");
  }) as unknown as SqlTag;
}

export type Branch = { id: string; name: string };
export type MemberStatus = "active" | "inactive";
/** Single user table: role 'admin' | 'member'. branchId only for members. */
export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "member";
  branchId?: string | null;
  status?: MemberStatus;
};
export type GameType = "standard" | "guessing" | "challenge";
export type Game = {
  id: string;
  name: string;
  date: string;
  description?: string;
  type?: GameType;
};
export type PointEntry = { id: string; gameId: string; memberId: string; points: number };
export type Submission = {
  id: string;
  gameId: string;
  memberId: string;
  answer: string;
  createdAt: string;
};

export type ChallengeStatus = "pending" | "accepted" | "rejected" | "completed";
export type Challenge = {
  id: string;
  gameId: string;
  challengerMemberId: string;
  opponentMemberId: string;
  pointsWagered: number;
  status: ChallengeStatus;
  winnerMemberId?: string;
  createdAt: string;
  respondedAt?: string;
  completedAt?: string;
};

export type AuditAction =
  | "challenge_created"
  | "challenge_accepted"
  | "challenge_rejected"
  | "challenge_winner_declared"
  | "point_entry_added"
  | "member_added"
  | "member_updated"
  | "game_created";
export type AuditLog = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  userId: string;
  userRole: "admin" | "member";
  userEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

let initPromise: Promise<void> | null = null;

/** Ensures tables exist (runs initDb once). Call before any query that needs the DB. */
export async function ensureDb(): Promise<void> {
  if (!initPromise) initPromise = initDb();
  await initPromise;
}

/** Run once after deploy: creates tables and seeds default branches. */
export async function initDb(): Promise<void> {
  if (!connectionString) {
    throw new Error(
      "POSTGRES_URL or DATABASE_URL is not set. In Vercel: connect a Postgres database (e.g. Neon) to this project."
    );
  }
  await sql`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'standard'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS point_entries (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      points INTEGER NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      answer TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      challenger_member_id TEXT NOT NULL,
      opponent_member_id TEXT NOT NULL,
      points_wagered INTEGER NOT NULL,
      status TEXT NOT NULL,
      winner_member_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      user_email TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      branch_id TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    )
  `;
  await sql`
    INSERT INTO branches (id, name) VALUES
      ('1', 'Branch Johor'),
      ('2', 'Branch Kuala Lumpur'),
      ('3', 'Branch Kuantan')
    ON CONFLICT (id) DO NOTHING
  `;
  await migrateAdminsAndMembersToUsers();
}

async function migrateAdminsAndMembersToUsers(): Promise<void> {
  const { rows: existing } = await sql`SELECT 1 FROM users LIMIT 1`;
  if (existing.length > 0) return;
  const { rows: adminRows } = await sql`SELECT id, email, password_hash, name FROM admins`;
  for (const a of adminRows as { id: string; email: string; password_hash: string; name: string | null }[]) {
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, branch_id, status)
      VALUES (${a.id}, ${a.email}, ${a.password_hash}, ${a.name ?? "Admin"}, 'admin', NULL, 'active')
      ON CONFLICT (id) DO NOTHING
    `;
  }
  const { rows: memberRows } = await sql`SELECT id, name, branch_id, email, password_hash, status FROM members`;
  for (const m of memberRows as { id: string; name: string; branch_id: string; email: string | null; password_hash: string | null; status: string }[]) {
    const email = m.email?.trim() ? m.email.trim().toLowerCase() : `${m.id}@member.local`;
    const pass = m.password_hash ?? "";
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, branch_id, status)
      VALUES (${m.id}, ${email}, ${pass}, ${m.name}, 'member', ${m.branch_id}, ${m.status ?? "active"})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function getBranches(): Promise<Branch[]> {
  await ensureDb();
  const { rows } = await sql`SELECT id, name FROM branches ORDER BY id`;
  return (rows as { id: string; name: string }[]).map((r) => ({ id: r.id, name: r.name }));
}

export async function getUsers(role?: "admin" | "member", branchId?: string): Promise<Omit<User, "passwordHash">[]> {
  await ensureDb();
  let rows: { id: string; email: string; name: string; role: string; branch_id: string | null; status: string }[];
  if (role && branchId) {
    const r = await sql`SELECT id, email, name, role, branch_id, status FROM users WHERE role = ${role} AND branch_id = ${branchId}`;
    rows = r.rows as typeof rows;
  } else if (role) {
    const r = await sql`SELECT id, email, name, role, branch_id, status FROM users WHERE role = ${role}`;
    rows = r.rows as typeof rows;
  } else {
    const r = await sql`SELECT id, email, name, role, branch_id, status FROM users`;
    rows = r.rows as typeof rows;
  }
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as "admin" | "member",
    branchId: r.branch_id ?? undefined,
    status: (r.status as MemberStatus) ?? "active",
  }));
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { rows } = await sql`SELECT id, email, password_hash, name, role, branch_id, status FROM users WHERE id = ${id}`;
  const r = (rows as { id: string; email: string; password_hash: string; name: string; role: string; branch_id: string | null; status: string }[])[0];
  return r
    ? {
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        name: r.name,
        role: r.role as "admin" | "member",
        branchId: r.branch_id ?? undefined,
        status: (r.status as MemberStatus) ?? "active",
      }
    : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const norm = email.trim().toLowerCase();
  const { rows } = await sql`SELECT id, email, password_hash, name, role, branch_id, status FROM users WHERE LOWER(email) = ${norm}`;
  const r = (rows as { id: string; email: string; password_hash: string; name: string; role: string; branch_id: string | null; status: string }[])[0];
  return r
    ? {
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        name: r.name,
        role: r.role as "admin" | "member",
        branchId: r.branch_id ?? undefined,
        status: (r.status as MemberStatus) ?? "active",
      }
    : undefined;
}

export async function addUser(
  email: string,
  passwordHash: string,
  name: string,
  role: "admin" | "member",
  branchId?: string | null
): Promise<User> {
  const normEmail = email.trim().toLowerCase();
  const { rows: existing } = await sql`SELECT id FROM users WHERE LOWER(email) = ${normEmail}`;
  if (existing.length > 0) throw new Error(role === "admin" ? "An admin with this email already exists" : "A member with this email already exists");
  const id = generateId();
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, branch_id, status)
    VALUES (${id}, ${normEmail}, ${passwordHash}, ${name}, ${role}, ${branchId ?? null}, 'active')
  `;
  return { id, email: normEmail, passwordHash, name, role, branchId: branchId ?? undefined, status: "active" };
}

export async function updateUser(
  userId: string,
  updates: { name?: string; email?: string; branchId?: string | null; status?: MemberStatus }
): Promise<Omit<User, "passwordHash"> | null> {
  const current = await getUserById(userId);
  if (!current) return null;
  let name = current.name;
  let branchId = current.branchId ?? null;
  let email = current.email;
  let status = (current.status ?? "active") as string;
  if (updates.name !== undefined) name = updates.name.trim();
  if (updates.branchId !== undefined) branchId = updates.branchId && updates.branchId.trim() ? updates.branchId.trim() : null;
  if (updates.status !== undefined) status = updates.status;
  if (updates.email !== undefined) {
    const normEmail = updates.email.trim().toLowerCase();
    const { rows: taken } = await sql`SELECT id FROM users WHERE LOWER(email) = ${normEmail} AND id != ${userId}`;
    if (taken.length > 0) throw new Error("A user with this email already exists");
    email = normEmail;
  }
  await sql`
    UPDATE users SET name = ${name}, branch_id = ${branchId}, email = ${email}, status = ${status}
    WHERE id = ${userId}
  `;
  return { id: userId, email, name, role: current.role, branchId: branchId ?? undefined, status: status as MemberStatus };
}

export async function setUserAccount(userId: string, email: string, passwordHash: string): Promise<Omit<User, "passwordHash"> | null> {
  const normEmail = email.trim().toLowerCase();
  const { rows: existing } = await sql`SELECT id FROM users WHERE LOWER(email) = ${normEmail} AND id != ${userId}`;
  if (existing.length > 0) throw new Error("A user with this email already exists");
  const { rows } = await sql`
    UPDATE users SET email = ${normEmail}, password_hash = ${passwordHash} WHERE id = ${userId}
    RETURNING id, email, name, role, branch_id, status
  `;
  const r = (rows as { id: string; email: string; name: string; role: string; branch_id: string | null; status: string }[])[0];
  if (!r) return null;
  return { id: r.id, email: r.email, name: r.name, role: r.role as "admin" | "member", branchId: r.branch_id ?? undefined, status: (r.status as MemberStatus) ?? "active" };
}

export async function getUsersNeedingAccounts(): Promise<User[]> {
  const { rows } = await sql`SELECT id, email, password_hash, name, role, branch_id, status FROM users WHERE role = 'member' AND (password_hash IS NULL OR password_hash = '')`;
  return (rows as { id: string; email: string; password_hash: string | null; name: string; role: string; branch_id: string | null; status: string }[]).map((r) => ({
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash ?? "",
    name: r.name,
    role: r.role as "admin" | "member",
    branchId: r.branch_id ?? undefined,
    status: (r.status as MemberStatus) ?? "active",
  }));
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<boolean> {
  const { rowCount } = await sql`UPDATE users SET password_hash = ${newPasswordHash} WHERE id = ${userId}`;
  return (rowCount ?? 0) > 0;
}

export async function getGames(): Promise<Game[]> {
  const { rows } = await sql`SELECT id, name, date, description, type FROM games ORDER BY date DESC`;
  return (rows as { id: string; name: string; date: string; description: string | null; type: string }[]).map(
    (r) => ({ id: r.id, name: r.name, date: r.date, description: r.description ?? undefined, type: r.type as GameType })
  );
}

export async function getGame(id: string): Promise<Game | undefined> {
  const { rows } = await sql`SELECT id, name, date, description, type FROM games WHERE id = ${id}`;
  const r = (rows as { id: string; name: string; date: string; description: string | null; type: string }[])[0];
  return r ? { id: r.id, name: r.name, date: r.date, description: r.description ?? undefined, type: r.type as GameType } : undefined;
}

export async function getPointEntries(gameId?: string): Promise<PointEntry[]> {
  const { rows } = gameId
    ? await sql`SELECT id, game_id, member_id, points FROM point_entries WHERE game_id = ${gameId}`
    : await sql`SELECT id, game_id, member_id, points FROM point_entries`;
  return (rows as { id: string; game_id: string; member_id: string; points: number }[]).map((r) => ({
    id: r.id,
    gameId: r.game_id,
    memberId: r.member_id,
    points: r.points,
  }));
}

export async function getMemberTotalPoints(memberId: string): Promise<number> {
  const { rows } = await sql`
    SELECT COALESCE(SUM(points), 0) AS total FROM point_entries WHERE member_id = ${memberId}
  `;
  const r = (rows as { total: string }[])[0];
  return r ? Number(r.total) : 0;
}

export type LeaderboardEntry = {
  userId: string;
  userName: string;
  totalPoints: number;
  branchId?: string | null;
  branchName?: string;
};

/** Single global leaderboard; branch details kept for display. Includes all members and sums point_entries (join + any other). */
export async function getLeaderboard(branchNames?: Map<string, string>): Promise<LeaderboardEntry[]> {
  await ensureDb();
  const { rows: members } = await sql`SELECT id, name, branch_id FROM users WHERE role = 'member'`;
  const { rows: entries } = await sql`SELECT member_id, points FROM point_entries`;
  const totals: Record<string, number> = {};
  for (const m of members as { id: string; name: string; branch_id: string | null }[]) {
    totals[String(m.id)] = 0;
  }
  for (const e of entries as { member_id: string | number; points: number }[]) {
    const key = String(e.member_id);
    if (key in totals) totals[key] = (totals[key] ?? 0) + Number(e.points);
  }
  return (members as { id: string; name: string; branch_id: string | null }[])
    .map((m) => {
      const key = String(m.id);
      return {
        userId: m.id,
        userName: m.name,
        totalPoints: totals[key] ?? 0,
        branchId: m.branch_id ?? undefined,
        branchName: m.branch_id && branchNames ? branchNames.get(String(m.branch_id)) : undefined,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export async function addBranch(name: string): Promise<Branch> {
  const id = generateId();
  await sql`INSERT INTO branches (id, name) VALUES (${id}, ${name})`;
  return { id, name };
}


export async function addGame(
  name: string,
  date: string,
  description?: string,
  type: GameType = "standard"
): Promise<Game> {
  const id = generateId();
  await sql`
    INSERT INTO games (id, name, date, description, type)
    VALUES (${id}, ${name}, ${date}, ${description ?? null}, ${type})
  `;
  return { id, name, date, description, type };
}

export async function getSubmissions(gameId: string): Promise<Submission[]> {
  const { rows } = await sql`
    SELECT id, game_id, member_id, answer, created_at FROM submissions
    WHERE game_id = ${gameId}
    ORDER BY created_at
  `;
  return (rows as { id: string; game_id: string; member_id: string; answer: string; created_at: Date }[]).map(
    (r) => ({
      id: r.id,
      gameId: r.game_id,
      memberId: r.member_id,
      answer: r.answer,
      createdAt: new Date(r.created_at).toISOString(),
    })
  );
}

export async function addSubmission(gameId: string, memberId: string, answer: string): Promise<Submission> {
  const id = generateId();
  await sql`
    INSERT INTO submissions (id, game_id, member_id, answer, created_at)
    VALUES (${id}, ${gameId}, ${memberId}, ${answer.trim()}, NOW())
  `;
  return { id, gameId, memberId, answer: answer.trim(), createdAt: new Date().toISOString() };
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM submissions WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function addPointEntry(gameId: string, memberId: string, points: number): Promise<PointEntry> {
  const id = generateId();
  await sql`INSERT INTO point_entries (id, game_id, member_id, points) VALUES (${id}, ${gameId}, ${memberId}, ${points})`;
  return { id, gameId, memberId, points };
}

export async function hasUserJoinedGame(gameId: string, userId: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT 1 FROM point_entries WHERE game_id = ${gameId} AND member_id = ${userId} LIMIT 1
  `;
  return (rows as unknown[]).length > 0;
}

export type GameWithPoints = Game & { totalPointsFromGame: number };

export async function getGamesJoinedByUser(userId: string): Promise<GameWithPoints[]> {
  const { rows } = await sql`
    SELECT g.id, g.name, g.date, g.description, g.type,
           COALESCE(SUM(pe.points), 0)::int AS total_points
    FROM games g
    INNER JOIN point_entries pe ON pe.game_id = g.id AND pe.member_id = ${userId}
    GROUP BY g.id, g.name, g.date, g.description, g.type
    ORDER BY g.date DESC
  `;
  return (rows as { id: string; name: string; date: string; description: string | null; type: string; total_points: number }[]).map(
    (r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      description: r.description ?? undefined,
      type: (r.type as GameType) ?? "standard",
      totalPointsFromGame: r.total_points,
    })
  );
}

export async function deletePointEntry(id: string): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM point_entries WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function getChallenges(): Promise<Challenge[]> {
  const { rows } = await sql`
    SELECT id, game_id, challenger_member_id, opponent_member_id, points_wagered, status,
           winner_member_id, created_at, responded_at, completed_at
    FROM challenges ORDER BY created_at DESC
  `;
  return (rows as {
    id: string;
    game_id: string;
    challenger_member_id: string;
    opponent_member_id: string;
    points_wagered: number;
    status: string;
    winner_member_id: string | null;
    created_at: Date;
    responded_at: Date | null;
    completed_at: Date | null;
  }[]).map((r) => ({
    id: r.id,
    gameId: r.game_id,
    challengerMemberId: r.challenger_member_id,
    opponentMemberId: r.opponent_member_id,
    pointsWagered: r.points_wagered,
    status: r.status as ChallengeStatus,
    winnerMemberId: r.winner_member_id ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    respondedAt: r.responded_at ? new Date(r.responded_at).toISOString() : undefined,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
  }));
}

export async function getChallengeById(id: string): Promise<Challenge | undefined> {
  const { rows } = await sql`
    SELECT id, game_id, challenger_member_id, opponent_member_id, points_wagered, status,
           winner_member_id, created_at, responded_at, completed_at
    FROM challenges WHERE id = ${id}
  `;
  const r = (rows as {
    id: string;
    game_id: string;
    challenger_member_id: string;
    opponent_member_id: string;
    points_wagered: number;
    status: string;
    winner_member_id: string | null;
    created_at: Date;
    responded_at: Date | null;
    completed_at: Date | null;
  }[])[0];
  if (!r) return undefined;
  return {
    id: r.id,
    gameId: r.game_id,
    challengerMemberId: r.challenger_member_id,
    opponentMemberId: r.opponent_member_id,
    pointsWagered: r.points_wagered,
    status: r.status as ChallengeStatus,
    winnerMemberId: r.winner_member_id ?? undefined,
    createdAt: new Date(r.created_at).toISOString(),
    respondedAt: r.responded_at ? new Date(r.responded_at).toISOString() : undefined,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
  };
}

export async function createChallenge(
  gameId: string,
  challengerMemberId: string,
  opponentMemberId: string,
  pointsWagered: number
): Promise<Challenge> {
  const game = await getGame(gameId);
  if (!game || (game.type as string) !== "challenge") {
    throw new Error("Game not found or not a challenge game");
  }
  if (challengerMemberId === opponentMemberId) {
    throw new Error("Cannot challenge yourself");
  }
  const id = generateId();
  await sql`
    INSERT INTO challenges (id, game_id, challenger_member_id, opponent_member_id, points_wagered, status, created_at)
    VALUES (${id}, ${gameId}, ${challengerMemberId}, ${opponentMemberId}, ${pointsWagered}, 'pending', NOW())
  `;
  return {
    id,
    gameId,
    challengerMemberId,
    opponentMemberId,
    pointsWagered,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function respondToChallenge(
  challengeId: string,
  action: "accept" | "reject"
): Promise<Challenge | null> {
  const status = action === "accept" ? "accepted" : "rejected";
  const { rowCount } = await sql`
    UPDATE challenges SET status = ${status}, responded_at = NOW() WHERE id = ${challengeId} AND status = 'pending'
  `;
  if ((rowCount ?? 0) === 0) return null;
  return (await getChallengeById(challengeId)) ?? null;
}

export async function declareChallengeWinner(challengeId: string, winnerMemberId: string): Promise<Challenge | null> {
  const c = await getChallengeById(challengeId);
  if (!c || c.status !== "accepted") return null;
  if (winnerMemberId !== c.challengerMemberId && winnerMemberId !== c.opponentMemberId) {
    throw new Error("Winner must be challenger or opponent");
  }
  const loserMemberId = winnerMemberId === c.challengerMemberId ? c.opponentMemberId : c.challengerMemberId;
  const wager = c.pointsWagered;
  await sql`
    UPDATE challenges SET winner_member_id = ${winnerMemberId}, status = 'completed', completed_at = NOW()
    WHERE id = ${challengeId}
  `;
  await addPointEntry(c.gameId, winnerMemberId, wager);
  await addPointEntry(c.gameId, loserMemberId, -wager);
  return (await getChallengeById(challengeId)) ?? null;
}

export async function createAuditLog(
  action: AuditAction,
  entityType: string,
  entityId: string,
  userId: string,
  userRole: "admin" | "member",
  userEmail: string,
  details: Record<string, unknown> = {}
): Promise<AuditLog> {
  const id = generateId();
  await sql`
    INSERT INTO audit_logs (id, action, entity_type, entity_id, user_id, user_role, user_email, details, created_at)
    VALUES (${id}, ${action}, ${entityType}, ${entityId}, ${userId}, ${userRole}, ${userEmail}, ${JSON.stringify(details)}::jsonb, NOW())
  `;
  return {
    id,
    action,
    entityType,
    entityId,
    userId,
    userRole,
    userEmail,
    details,
    createdAt: new Date().toISOString(),
  };
}

export async function getAuditLogs(limit = 200): Promise<AuditLog[]> {
  const { rows } = await sql`
    SELECT id, action, entity_type, entity_id, user_id, user_role, user_email, details, created_at
    FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}
  `;
  return (rows as {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id: string;
    user_role: string;
    user_email: string;
    details: unknown;
    created_at: Date;
  }[]).map((r) => ({
    id: r.id,
    action: r.action as AuditAction,
    entityType: r.entity_type,
    entityId: r.entity_id,
    userId: r.user_id,
    userRole: r.user_role as "admin" | "member",
    userEmail: r.user_email,
    details: (r.details as Record<string, unknown>) ?? {},
    createdAt: new Date(r.created_at).toISOString(),
  }));
}
