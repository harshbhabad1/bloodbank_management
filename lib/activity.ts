import { db } from "./db/index";
import { activityLog } from "./db/schema";

type ActivityInput = {
  action: string;
  entity: string;
  entityId: number;
  message: string;
};

/**
 * Log an activity event. Pass a drizzle transaction object (tx)
 * or the main db client so the log is part of the same transaction.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logActivity(tx: any, input: ActivityInput) {
  await tx.insert(activityLog).values(input);
}

export async function getRecentActivity(limit = 10) {
  return db.query.activityLog.findMany({
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit,
  });
}
