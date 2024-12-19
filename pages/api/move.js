export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const gameState = req.body;

  if (req.method !== "POST") {
    res.status(404).json({ message: "Only for POST" });
    return;
  }

  if (!gameState) {
    res.status(400).json({ message: "Missing gamestate" });
    return;
  }

  let isMoveSafe = {
    up: true,
    down: true,
    left: true,
    right: true,
  };

  // Get current head and neck position
  const myHead = gameState.you.body[0];
  const myNeck = gameState.you.body[1];

  // Prevent moving backwards
  if (myNeck.x < myHead.x) {
    isMoveSafe.left = false;
  } else if (myNeck.x > myHead.x) {
    isMoveSafe.right = false;
  } else if (myNeck.y < myHead.y) {
    isMoveSafe.down = false;
  } else if (myNeck.y > myHead.y) {
    isMoveSafe.up = false;
  }

  // Step 1: Prevent moving out of bounds
  const boardWidth = gameState.board.width;
  const boardHeight = gameState.board.height;

  if (myHead.x === 0) isMoveSafe.left = false;
  if (myHead.x === boardWidth - 1) isMoveSafe.right = false;
  if (myHead.y === 0) isMoveSafe.down = false;
  if (myHead.y === boardHeight - 1) isMoveSafe.up = false;

  // Step 2: Prevent colliding with itself
  const myBody = gameState.you.body;
  const nextPositions = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y },
  };

  Object.keys(nextPositions).forEach(move => {
    const nextPos = nextPositions[move];
    if (myBody.some(segment => segment.x === nextPos.x && segment.y === nextPos.y)) {
      isMoveSafe[move] = false;
    }
  });

  // Step 3: Prevent colliding with other snakes
  const opponents = gameState.board.snakes;
  Object.keys(nextPositions).forEach(move => {
    const nextPos = nextPositions[move];
    opponents.forEach(snake => {
      if (snake.body.some(segment => segment.x === nextPos.x && segment.y === nextPos.y)) {
        isMoveSafe[move] = false;
      }
    });
  });

  // Get safe moves
  const safeMoves = Object.keys(isMoveSafe).filter((key) => isMoveSafe[key]);
  if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves detected! Moving down`);
    res.status(200).json({ move: "down" });
    return;
  }

  // Step 4: Move towards food instead of random
  const food = gameState.board.food;
  
  if (food.length > 0 && gameState.you.health < 50) {
    // Find closest food
    const closestFood = food.reduce((closest, foodItem) => {
      const distanceToFood = Math.abs(myHead.x - foodItem.x) + Math.abs(myHead.y - foodItem.y);
      const distanceToClosest = closest ? 
        Math.abs(myHead.x - closest.x) + Math.abs(myHead.y - closest.y) : 
        Infinity;
      return distanceToFood < distanceToClosest ? foodItem : closest;
    }, null);

    if (closestFood) {
      // Calculate moves that get us closer to food
      const moveScores = {};
      safeMoves.forEach(move => {
        const nextPos = nextPositions[move];
        const currentDistance = Math.abs(myHead.x - closestFood.x) + Math.abs(myHead.y - closestFood.y);
        const newDistance = Math.abs(nextPos.x - closestFood.x) + Math.abs(nextPos.y - closestFood.y);
        moveScores[move] = currentDistance - newDistance;
      });

      // Find the move that gets us closest to food
      const bestMoves = safeMoves.filter(move => moveScores[move] === Math.max(...Object.values(moveScores)));
      if (bestMoves.length > 0) {
        const nextMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        console.log(`MOVE ${gameState.turn}: ${nextMove}`);
        res.status(200).json({ move: nextMove });
        return;
      }
    }
  }

  // If no food-seeking move, choose a random safe move
  const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  console.log(`MOVE ${gameState.turn}: ${nextMove}`);
  res.status(200).json({ move: nextMove });
}