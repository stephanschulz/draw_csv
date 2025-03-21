# CSV Line Drawer

A simple web application that draws lines from start points to end points defined in a CSV file.

## Usage

1. Open `src/index.html` in a web browser
2. Click "Choose File" and select your CSV file
3. Click "Draw Lines" to visualize the connections
4. Click "Clear Canvas" to reset the visualization

## CSV Format

The application expects a CSV file with the following format:

```
start points,,,,,end points,,,,,,,{0},,,,,{0}
0,"{x1,","y1,",z1},,0,"{x2,","y2,",z2},,,,,,,,,
1,"{x1,","y1,",z1},,1,"{x2,","y2,",z2},,,,,,,,,
...
```

Each line in the CSV represents a connection between a start point (x1,y1,z1) and an end point (x2,y2,z2).

## Visualization

- Start points are marked with blue dots
- End points are marked with red dots
- Lines are drawn between connected points
- The visualization is automatically scaled to fit the canvas 