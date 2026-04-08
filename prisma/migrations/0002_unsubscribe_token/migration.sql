-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "unsubscribeToken" TEXT;

CREATE UNIQUE INDEX "Subscription_unsubscribeToken_key" ON "Subscription"("unsubscribeToken");
