const fs = require("fs");

function validateAtlas(layout) {
  const slots = layout.slots;
  const errors = [];

  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slotA = slots[i];
      const slotB = slots[j];

      if (detectCollision(slotA, slotB)) {
        errors.push(
          `Collision detected between slot ${slotA.id} (${slotA.name}) and slot ${slotB.id} (${slotB.name})`
        );
      }
    }
  }

  return errors;
}

function detectCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

fs.readFile("ui-layout.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading the file:", err);
    return;
  }
  const layout = JSON.parse(data);
  const validationErrors = validateAtlas(layout);

  if (validationErrors.length > 0) {
    console.error("Validation failed with the following errors:");
    validationErrors.forEach((error) => console.error(error));
  } else {
    console.log("Validation successful. No collisions detected.");
  }
});
