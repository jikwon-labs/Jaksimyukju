-- 완주 메달: 완주 시각과 수여 화면을 본 시각
ALTER TABLE "courses" ADD COLUMN "finishedAt" TIMESTAMP(3);
ALTER TABLE "courses" ADD COLUMN "medalSeenAt" TIMESTAMP(3);

-- 이미 완주한 과정은 마지막으로 마친 레슨 시각을 완주 시각으로 채운다(수여 화면은 다음 방문에 한 번 뜬다)
UPDATE "courses" c
SET "finishedAt" = COALESCE((SELECT MAX(l."completedAt") FROM "lessons" l WHERE l."courseId" = c."id"), c."createdAt")
WHERE c."status" = 'finished';
