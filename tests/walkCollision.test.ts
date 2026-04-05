import { describe, it } from "vitest";

describe("walkCollision canMoveTo", () => {
  it.todo("returns target point when no walls block the path");
  it.todo("blocks movement when target crosses a wall segment AABB with default 1ft padding");
  it.todo("slides along wall when approaching at an angle (returns partial movement)");
  it.todo("clamps target to room bounds (0 <= x <= room.width, 0 <= z <= room.length)");
  it.todo("ignores product and opening collisions (walls only)");
  it.todo("custom padding parameter overrides the 1ft default");
});

describe("walkCollision room bounds clamp", () => {
  it.todo("clamps x to [0, room.width]");
  it.todo("clamps z to [0, room.length]");
  it.todo("leaves valid in-bounds points unchanged");
});
