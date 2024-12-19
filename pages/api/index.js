export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");

  const snakeInfo = {
    apiversion: "1",
    author: "mariusz", //Username for play.battlesnake
    color: "#4C89C8",
    head: "replit-mark",
    tail: "replit-notmark",
  };

  res.json(snakeInfo);
}
