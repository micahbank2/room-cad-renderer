import { describe, it } from "vitest";
describe("cadStore actions", () => {
  it.todo("placeProduct returns new id and adds to placedProducts");
  it.todo("moveProduct updates position");
  it.todo("rotateProduct updates rotation and pushes history");
  it.todo("rotate: rotateProductNoHistory updates rotation without pushing history");
  it.todo("updateWall: wall resize corner propagates to shared-endpoint walls");
  it.todo("undo restores prior snapshot");
  it.todo("redo re-applies undone snapshot");
});
