// Generate fixed hours for xAxis
function generateFixedTicks(currentDate) {
  const hours = [10, 12, 14, 16, 18, 20];
  return hours.map(hour => {
    const tick = new Date(currentDate);
    tick.setHours(hour, 0);
    return tick;
  });
}

// Fonction principale
async function draw() {

  const filter = ["1d", "5d", "1m", "6m", "1y", "5y", "max"];

  // Parser
  const hourFormat = d3.timeFormat("%H:%M");
  const parseDate = d3.utcParse("%Y-%m-%d %H:%M:%S%Z");

  // Accessor
  const yAccessor = (d) => +d.close;

  // Get datas
  const data = await d3.csv("datas/1D.csv", (d) => {
    const date = parseDate(d.Datetime);
    date.setHours(date.getHours()-5)
    return {
      date: date,
      close: +d.Close,
    };
  });

  // Get current date
  const currentDate = data[0].date;
  const startDate = new Date(currentDate).setHours(9, 30);
  const endDate = new Date(currentDate).setHours(20, 30);
  const ticks1D = generateFixedTicks(currentDate);

  // Constants
  const margin = {
    top: 10,
    bottom: 20,
    left: 30,
    right: 40,
  };
  const svg = d3.select("#chart svg");
  const width = svg.node().clientWidth - margin.right;
  const height = svg.node().clientHeight - margin.bottom;
  const ctr = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

  // Scales
  const xScale = d3
    .scaleUtc()
    .domain([startDate, endDate])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([
      Math.floor(d3.min(data, yAccessor)),
      Math.ceil(d3.max(data, yAccessor)),
    ])
    .range([height, margin.top])
    .nice();

  // Axis
  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(ticks1D)
    .tickFormat(hourFormat)
    .tickSizeOuter(0);
  ctr.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d3.format("d"))
    .ticks(4)
    .tickSizeOuter(0);
  ctr.append("g").classed("y-axis", true).call(yAxis);


  //Styling Axis
  ctr.selectAll(".domain").remove();
  ctr.selectAll(".y-axis .tick line").attr("x2", width)
  ctr.selectAll(".y-axis .tick line").classed("chart-line", true);
  ctr.selectAll(".tick text").style("font-size", "13px").classed("chart-text", true);

  // Lines
  const line = d3
    .line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.close));

  ctr
    .append("path")
    .attr("fill", "none")
    .attr("stroke-width", 2)
    .classed("main-line", true)
    .attr("d", line(data));
}

draw();
