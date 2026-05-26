-- AlterTable: drop emoji and button_id (also drops their unique index), add label
ALTER TABLE "reaction_role_mappings" DROP COLUMN "button_id",
DROP COLUMN "emoji",
ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reaction_role_mappings_menu_id_role_id_key" ON "reaction_role_mappings"("menu_id", "role_id");
