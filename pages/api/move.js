export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(404).json({ message: "Only POST method is supported" });
    return;
  }

  const gameState = req.body;

  if (!gameState) {
    res.status(400).json({ message: "Missing game state" });
    return;
  }

  const { you, board } = gameState;
  const myHead = you.body[0];
  const myBody = you.body; // Including the head and tail of the snake
  const boardWidth = board.width;
  const boardHeight = board.height;

  // Utility functions
  const isOutOfBounds = (pos) =>
    pos.x < 0 || pos.y < 0 || pos.x >= boardWidth || pos.y >= boardHeight;

  const isCollision = (pos, body) =>
    body.some(segment => segment.x === pos.x && segment.y === pos.y);

  // Generate next positions for all possible moves
  const nextPositions = {
    up: { x: myHead.x, y: myHead.y + 1 },
    down: { x: myHead.x, y: myHead.y - 1 },
    left: { x: myHead.x - 1, y: myHead.y },
    right: { x: myHead.x + 1, y: myHead.y },
  };

  // Determine safe moves (avoiding walls and self-collision)
  const safeMoves = Object.entries(nextPositions)
    .filter(([_, pos]) => 
      !isOutOfBounds(pos) && 
      !isCollision(pos, myBody) && // Avoid moving into own body
      !isCollision(pos, board.snakes.flatMap(s => s.body)) // Avoid other snakes
    )
    .map(([move]) => move);

  if (safeMoves.length === 0) {
    console.log(`MOVE ${gameState.turn}: No safe moves! Defaulting to "down".`);
    res.status(200).json({ move: "down" });
    return;
  }

  // Food-seeking logic (seeking food if health is low)
  const food = board.food;
  if (food.length > 0 && you.health < 90) {
    const getDistance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    const closestFood = food.reduce((closest, foodItem) => {
      const distanceToFood = getDistance(myHead, foodItem);
      const closestDistance = closest
        ? getDistance(myHead, closest)
        : Infinity;
      return distanceToFood < closestDistance ? foodItem : closest;
    }, null);

    if (closestFood) {
      // A* Pathfinding to find the best move towards food
      const aStar = (start, goal) => {
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = { [`${start.x},${start.y}`]: 0 };
        const fScore = { [`${start.x},${start.y}`]: getDistance(start, goal) };

        while (openSet.length > 0) {
          openSet.sort((a, b) =>
            (fScore[`${a.x},${a.y}`] || Infinity) -
            (fScore[`${b.x},${b.y}`] || Infinity)
          );

          const current = openSet.shift();
          if (current.x === goal.x && current.y === goal.y) {
            const path = [];
            let temp = current;
            while (cameFrom.has(`${temp.x},${temp.y}`)) {
              path.unshift(cameFrom.get(`${temp.x},${temp.y}`));
              temp = path[0];
            }
            return path;
          }

          const getNeighbors = (pos) => [
            { x: pos.x, y: pos.y - 1 },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x + 1, y: pos.y },
          ];

          getNeighbors(current).forEach((neighbor) => {
            if (
              isOutOfBounds(neighbor) ||
              isCollision(neighbor, myBody) ||
              isCollision(neighbor, board.snakes.flatMap(s => s.body))
            )
              return;

            const tentativeGScore =
              (gScore[`${current.x},${current.y}`] || Infinity) + 1;

            if (
              tentativeGScore <
              (gScore[`${neighbor.x},${neighbor.y}`] || Infinity)
            ) {
              cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
              gScore[`${neighbor.x},${neighbor.y}`] = tentativeGScore;
              fScore[`${neighbor.x},${neighbor.y}`] =
                tentativeGScore + getDistance(neighbor, goal);

              if (
                !openSet.some(
                  (pos) => pos.x === neighbor.x && pos.y === neighbor.y
                )
              ) {
                openSet.push(neighbor);
              }
            }
          });
        }

        return null;
      };

      const path = aStar(myHead, closestFood);
      if (path && path.length > 0) {
        const nextMove = safeMoves.find((move) => {
          const nextPos = nextPositions[move];
          return nextPos.x === path[0].x && nextPos.y === path[0].y;
        });

        if (nextMove) {
          console.log(`MOVE ${gameState.turn}: Moving towards food with "${nextMove}"`);
          res.status(200).json({ move: nextMove });
          return;
        }
      }
    }
  }

  // Default to a random safe move if no food-seeking path is available
  const nextMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
  console.log(`MOVE ${gameState.turn}: Defaulting to "${nextMove}"`);
  res.status(200).json({ move: nextMove });
}
