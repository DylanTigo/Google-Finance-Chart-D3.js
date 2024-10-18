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
  const tooltip = ctr.append("g").attr("id", "tooltip").attr("opacity", "0");

  // Background rectangle for the tooltip
  tooltip
    .append("rect")
    .attr("fill", "var(--color-background-2)")
    .attr("rx", 4)
    .attr("ry", 4);

  // Text element for date and close price
  const tooltipText = tooltip
    .append("text")
    .attr("fill", "var(--color-text-secondary)")
    .attr("x", 8)
    .attr("y", 16);

  // Add tspan elements for date and close
  const tooltipClose = tooltipText
    .append("tspan")
    .style("fill", "var(--color-text-primary)");
  const tooltipDate = tooltipText.append("tspan");
  const space = "\u00A0";

  const tooltipsDot = ctr
    .append("circle")
    .attr("r", 4)
    .attr("fill", "var(--color-positive)")
    .attr("stroke", "none")
    .style("opacity", 0)
    .style("pointer-events", "none");

  const tooltipLine = ctr
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", margin.top*2)
    .attr("y2", height)
    .attr("stroke", "var(--color-text-ternary)")
    .attr("stroke-dasharray", 3)
    .attr("opacity", 0)
    .style("pointer-events", "none");

  // Add event listener to move tooltip
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

      tooltipsDot
        .style("opacity", 1)
        .attr("cx", xScale(currentElt.date))
        .attr("cy", yScale(currentElt.close));

      tooltip.attr("opacity", 1);

      const formattedClose = currentElt.close.toFixed(2);
      const formattedDate = hourFormat(currentElt.date);

      tooltipClose.text(formattedClose + space + "USD" + space + space + space);
      tooltipDate.text(formattedDate);

      // Calculate tooltip dimensions for tooltip dynamic width
      const textBBox = tooltipText.node().getBBox();
      const tooltipWidth = textBBox.width + 16;
      const tooltipHeight = 24;

      tooltip
        .select("rect")
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight);

      // Position the tooltip
      let tooltipX = xScale(currentElt.date) - tooltipWidth / 2;
      tooltipX = Math.max(-2, Math.min(width - tooltipWidth, tooltipX));
      tooltip.attr("transform", `translate(${tooltipX}, 12)`).raise();

      //Line tooltip
      tooltipLine
        .attr("opacity", 0.7)
        .attr("x1", xScale(currentElt.date))
        .attr("x2", xScale(currentElt.date))
    });
}

draw();
