// Import axios and set up an Express route
import axios from "axios";
import express from "express";
const app = express();

app.use(
  cors({
    origin: "*", // Allow requests from your frontend's origin
    credentials: true, // Allow cookies and credentials
  })
);

app.get("/api/service-data", async (req, res) => {
  try {
    const { userId } = req.query;

    // Fetch data from the external API
    const response = await axios.get(
      `https://own5k.in/p/final.php${userId ? `?userId=${userId}` : ""}`
    );

    // Send the response data back to the client
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
