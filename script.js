// Constants
const margin = { top: 10, bottom: 20, left: 30, right: 40 };
const hourFormat = d3.timeFormat("%H:%M");
// const dateFormat = d3.timeFormat("")
const parseDate = d3.utcParse("%Y-%m-%d %H:%M:%S%Z");
const yAccessor = (d) => +d.close;
const fixedHours = [10, 12, 14, 16, 18, 20];

// DOM Elements
const chartSvg = d3.select("#chart svg");
const buttons = document.querySelectorAll(".btn");

// Event Listeners
buttons.forEach((button) =>
  button.addEventListener("click", handleActiveButton)
);

// handle active buttons
function handleActiveButton(e) {
  const isActive = e.target.classList.contains("active");
  buttons.forEach((button) => button.classList.remove("active"));
  if (!isActive) e.target.classList.add("active");
}

// Fixed date Generator
function generateFixedTicks(currentDate) {
  return fixedHours.map((hour) => {
    const tick = new Date(currentDate);
    tick.setHours(hour, 0);
    return tick;
  });
}

// get Data
async function fetchData() {
  return d3.csv("datas/1D.csv", (d) => {
    const date = parseDate(d.Datetime);
    date.setHours(date.getHours() - 5);
    return { date, close: +d.Close };
  });
}

function setupScales(data, dimensions) {
  const currentDate = data[0].date;
  const xMin = new Date(currentDate).setHours(9, 30);
  const xMax = new Date(currentDate).setHours(20, 30);
  const yMin = Math.floor(d3.min(data, yAccessor));
  const yMax = Math.ceil(d3.max(data, yAccessor));

  const xScale = d3
    .scaleUtc()
    .domain([xMin, xMax])
    .range([0, dimensions.width]);
  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([dimensions.height, margin.top])
    .nice();

  return { xScale, yScale, yMin, yMax };
}

function createAxes(container, scales, dimensions, currentDate) {
  const ticks1D = generateFixedTicks(currentDate);
  const xAxis = d3
    .axisBottom(scales.xScale)
    .tickValues(ticks1D)
    .tickFormat(hourFormat)
    .tickSizeOuter(0);

  const yAxis = d3
    .axisLeft(scales.yScale)
    .tickFormat(d3.format("d"))
    .tickValues(d3.range(scales.yMin, scales.yMax + 1))
    .tickSizeOuter(0);

  container
    .append("g")
    .attr("transform", `translate(0, ${dimensions.height})`)
    .call(xAxis);

  container.append("g").classed("y-axis", true).call(yAxis);

  styleAxes(container, dimensions);
}

function styleAxes(container, dimensions) {
  container.selectAll(".domain").remove();
  container
    .selectAll(".y-axis .tick line")
    .attr("x2", dimensions.width)
    .classed("chart-line", true);
  container
    .selectAll(".tick text")
    .style("font-size", "13px")
    .classed("chart-text", true);
}

function createLine(container, data, scales) {
  const line = d3
    .line()
    .x((d) => scales.xScale(d.date))
    .y((d) => scales.yScale(d.close));

  container
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--color-positive)")
    .attr("stroke-width", 2)
    .attr("d", line);
}

function createGradientArea(container, data, scales, dimensions) {
  const gradient = container
    .append("defs")
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

  const area = d3
    .area()
    .x((d) => scales.xScale(d.date))
    .y0(dimensions.height)
    .y1((d) => scales.yScale(d.close));

  container
    .append("path")
    .datum(data)
    .attr("stroke", "none")
    .attr("fill", "url(#area-gradient)")
    .attr("d", area);
}

function createTooltip(container, dimensions) {
  const tooltip = container
    .append("g")
    .attr("id", "tooltip")
    .attr("opacity", "0");
  tooltip
    .append("rect")
    .attr("fill", "var(--color-background-2)")
    .attr("rx", 4)
    .attr("ry", 4);

  const tooltipText = tooltip
    .append("text")
    .attr("fill", "var(--color-text-secondary)")
    .attr("x", 8)
    .attr("y", 15);

  const tooltipClose = tooltipText
    .append("tspan")
    .style("fill", "var(--color-text-primary)");
  const tooltipDate = tooltipText.append("tspan");

  const tooltipDot = container
    .append("circle")
    .attr("r", 4)
    .attr("fill", "var(--color-positive)")
    .attr("stroke", "none")
    .style("opacity", 0)
    .style("pointer-events", "none");

  const tooltipLine = container
    .append("line")
    .attr("stroke", "var(--color-text-ternary)")
    .attr("stroke-dasharray", 3)
    .attr("opacity", 0)
    .style("pointer-events", "none");

  return { tooltip, tooltipClose, tooltipDate, tooltipDot, tooltipLine };
}

function handleTooltipMovement(
  container,
  data,
  scales,
  dimensions,
  tooltipElements
) {
  const { tooltip, tooltipClose, tooltipDate, tooltipDot, tooltipLine } =
    tooltipElements;
  const bisector = d3.bisector((d) => d.date).left;

  container
    .append("rect")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)
    .style("opacity", 0)
    .on("mousemove touchmove", (event) => {
      const [currentX] = d3.pointer(event, container.node());
      const currentDate = scales.xScale.invert(currentX);
      const index = bisector(data, currentDate);
      const currentElt = data[index - 1];

      updateTooltipPosition(
        currentElt,
        scales,
        dimensions,
        tooltip,
        tooltipClose,
        tooltipDate,
        tooltipDot,
        tooltipLine
      );
    });
}

function updateTooltipPosition(
  currentElt,
  scales,
  dimensions,
  tooltip,
  tooltipClose,
  tooltipDate,
  tooltipDot,
  tooltipLine
) {
  const topMarge = 12;
  const bottomMarge = dimensions.height - margin.bottom - 6;

  tooltipDot
    .style("opacity", 1)
    .attr("cx", scales.xScale(currentElt.date))
    .attr("cy", scales.yScale(currentElt.close));

  tooltip.attr("opacity", 1);

  const formattedClose = currentElt.close.toFixed(2);
  const formattedDate = hourFormat(currentElt.date);
  const space = "\u00A0";

  tooltipClose.text(`${formattedClose}${space}USD${space}${space}`);
  tooltipDate.text(formattedDate);

  const textBBox = tooltip.select("text").node().getBBox();
  const tooltipWidth = textBBox.width + 16;
  const tooltipHeight = 22;

  tooltip
    .select("rect")
    .attr("width", tooltipWidth)
    .attr("height", tooltipHeight);

  const isNotHidingDot =
    topMarge + tooltipHeight + 5 > scales.yScale(currentElt.close);

  let tooltipX = scales.xScale(currentElt.date) - tooltipWidth / 2;
  tooltipX = Math.max(-2, Math.min(dimensions.width - tooltipWidth, tooltipX));
  const tooltipY = isNotHidingDot ? bottomMarge : topMarge;

  tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`).raise();

  tooltipLine
    .attr("opacity", 0.7)
    .attr("x1", scales.xScale(currentElt.date))
    .attr("x2", scales.xScale(currentElt.date))
    .attr("y1", isNotHidingDot ? margin.top : margin.top * 2)
    .attr(
      "y2",
      isNotHidingDot ? dimensions.height - margin.top * 2 : dimensions.height
    );
}

async function draw() {
  const data = await fetchData();
  const dimensions = {
    width: chartSvg.node().clientWidth - margin.right,
    height: chartSvg.node().clientHeight - margin.bottom,
  };

  const container = chartSvg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`);

  const scales = setupScales(data, dimensions);
  createAxes(container, scales, dimensions, data[0].date);
  createLine(container, data, scales);
  createGradientArea(container, data, scales, dimensions);

  const tooltipElements = createTooltip(container, dimensions);
  handleTooltipMovement(container, data, scales, dimensions, tooltipElements);
}

draw();

