// Handle active button
const buttons = document.querySelectorAll(".btn");
buttons.forEach((button) => {
  button.addEventListener("click", handleActiveButton);
});

function handleActiveButton(e) {
  const active = e.target.classList.contains("active");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });
  if (!active) {
    e.target.classList.add("active");
  }
}

// Generate fixed hours for xAxis
function generateFixedTicks(currentDate) {
  const hours = [10, 12, 14, 16, 18, 20];
  return hours.map((hour) => {
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
    date.setHours(date.getHours() - 5);
    return {
      date: date,
      close: +d.Close,
    };
  });

  // Get current date
  const currentDate = data[0].date;
  const ticks1D = generateFixedTicks(currentDate);

  //Scale min and max
  const xMin = new Date(currentDate).setHours(9, 30);
  const xMax = new Date(currentDate).setHours(20, 30);
  const yMin = Math.floor(d3.min(data, yAccessor));
  const yMax = Math.ceil(d3.max(data, yAccessor));

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
  const xScale = d3.scaleUtc().domain([xMin, xMax]).range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
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
    .tickValues(d3.range(yMin, yMax + 1))
    .tickSizeOuter(0);
  ctr.append("g").classed("y-axis", true).call(yAxis);

  //Styling Axis
  ctr.selectAll(".domain").remove();
  ctr.selectAll(".y-axis .tick line").attr("x2", width);
  ctr.selectAll(".y-axis .tick line").classed("chart-line", true);
  ctr
    .selectAll(".tick text")
    .style("font-size", "13px")
    .classed("chart-text", true);

  // Lines
  const line = d3
    .line()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.close));

  // Modifier la partie de la ligne
  const linePath = ctr
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--color-positive)")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Liniear gradient
  const defs = ctr.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");

  gradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "var(--color-gradiant-top)")
    .attr("stop-opacity", 0.35);
  gradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "var(--color-gradiant-bottom)")
    .attr("stop-opacity", 0);

  // Create shape area for gradient
  const area = d3
    .area()
    .x((d) => xScale(d.date))
    .y0(height)
    .y1((d) => yScale(d.close));
  ctr
    .append("path")
    .datum(data)
    .attr("stroke", "none")
    .attr("fill", "url(#area-gradient)")
    .attr("d", area);

  // Create the tooltips
  const tooltip = d3.select("#chart").append("div").attr("id", "tooltip");
  const tooltipDate = tooltip.append("span").attr("class", "date").text("Date");
  const tooltipClose = tooltip.append("span").text("Close");

  const tooltipDot = ctr
    .append("circle")
    .attr("r", 4)
    .attr("fill", "white")
    .attr("stroke", "none")
    .style("opacity", 0)
    .style("pointer-events", "none");

  ctr
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 0)
    .on("mousemove touchmove", (event) => {
      const [currentX, currentY] = d3.pointer(event, ctr.node());
      const currentDate = xScale.invert(currentX);

      const bisector = d3.bisector((d) => d.date).left;
      const index = bisector(data, currentDate);
      const currentElt = data[index - 1];

      tooltipDot
        .style("opacity", 1)
        .attr("cx", xScale(currentElt.date))
        .attr("cy", yScale(currentElt.close));
      // .raise();

      tooltip.style("opacity", 1);
    });
}

draw();
