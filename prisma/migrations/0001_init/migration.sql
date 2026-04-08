CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "lastSeenTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_email_repo_key" ON "Subscription"("email", "repo");
