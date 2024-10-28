// Period Configuration
const PeriodConfig = {
  "1d": {
    tickFormat: d3.timeFormat("%H:%M"),
    tooltipDateFormat: d3.timeFormat("%H:%M"),
    dataFile: "datas/1D.csv",
    gapTicksY: 1,
    generateTicks: (currentDate) => {
      const startDate = new Date(currentDate).setHours(10, 0);
      const endDate = new Date(currentDate).setHours(20, 0);

      const tickValues = d3.timeHour
        .range(startDate, endDate)
        .map((d) => d.getTime());

      return tickValues;
    },
  },
  "5d": {
    tickFormat: d3.timeFormat("%d %b"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b %H:%M"),
    dataFile: "datas/5D.csv",
    gapTicksY: 3,
    generateTicks: (startDate, endDate) => {
      const tickValues = d3.timeDay
        .range(startDate, endDate)
        .filter((d) => d.getTime() !== startDate.getTime())
        .map((d) => {
          d.setHours(9, 30);
          return d.getTime();
        });

      return tickValues;
    },
  },
  "1m": {
    tickFormat: d3.timeFormat("%d %b"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b"),
    dataFile: "datas/1M.csv",
    gapTicksY: 10,
    generateTicks: (startDate, endDate) => {
      const tickValues = d3.timeWeek
        .range(startDate, endDate)
        .filter((d) => {
          return d.getTime() !== startDate.getTime();
        })
        .map((d) => d.getTime());

      return tickValues;
    },
  },
  "6m": {
    tickFormat: d3.timeFormat("%b %Y"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b"),
    dataFile: "datas/6M.csv",
    gapTicksY: 20,
    generateTicks: (startDate, endDate) => {
      const tickValues = d3.timeMonth
        .range(startDate, endDate, 2)
        .filter((d) => {
          return d.getTime() !== startDate.getTime();
        })
        .map((d) => d.getTime());

      return tickValues;
    },
  },
};

// Parser
const parseDate = d3.utcParse("%Y-%m-%d %H:%M:%S%Z");
const yAccessor = (d) => +d.close;

// Constants
const margin = {
  top: 10,
  bottom: 20,
  left: 30,
  right: 40,
};
const space = "\u00A0";
const svg = d3.select("#chart svg");
const width = svg.node().clientWidth - margin.right;
const height = svg.node().clientHeight - margin.bottom;
const ctr = svg.append("g").attr("transform", `translate(${margin.left}, 0)`);

// get Data
async function fetchData(period) {
  return d3.csv(PeriodConfig[period].dataFile, (d, i) => {
    const date = d.Datetime.slice(0, 19);
    return { id: i, date: new Date(date), close: +d.Close };
  });
}

function generateTicksY(minData, maxData, gap) {
  const minTick = Math.floor(minData / gap) * gap;
  const maxTick = Math.ceil(maxData / gap) * gap;

  // Générer le tableau de ticks
  const ticks = [];
  for (let i = minTick; i <= maxTick; i += gap) {
    ticks.push(i);
  }
  return ticks;
}

// Setup Scales
function setupScales(data, startDate, endDate, period) {
  let xMin;
  let xMax;

  if (period === "1d") {
    xMin = new Date(startDate).setHours(9, 30);
    xMax = new Date(startDate).setHours(20, 30);
  } else {
    xMin = startDate;
    xMax = endDate;
  }

  const ticksY = generateTicksY(
    d3.min(data, yAccessor),
    d3.max(data, yAccessor),
    PeriodConfig[period].gapTicksY
  );

  const yMin = ticksY[0];
  const yMax = ticksY[ticksY.length - 1];

  const ticksX = PeriodConfig[period].generateTicks(startDate, endDate);

  const xScale = d3
    .scaleTime()
    .domain([xMin, xMax])
    .range([0, width - 2]);
  const yScale = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([height, margin.top])
    .nice();

  return { xScale, yScale, ticksX, ticksY };
}

// draw Axes
function createAxes(scales, period, data) {
  const { xScale, yScale, ticksX, ticksY } = scales;

  const xAxis = d3
    .axisBottom(xScale)
    .tickValues(ticksX)
    .tickFormat(PeriodConfig[period].tickFormat)
    .tickSizeOuter(0);

  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat(d3.format("d"))
    .tickValues(ticksY)
    .tickSizeOuter(0);

  ctr.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);
  ctr.append("g").classed("y-axis", true).call(yAxis);

  //Styling Axis
  ctr.selectAll(".domain").remove();
  ctr.selectAll(".y-axis .tick line").attr("x2", width);
  ctr.selectAll(".y-axis .tick line").classed("chart-line", true);
  ctr
    .selectAll(".tick text")
    .style("font-size", "13px")
    .classed("chart-text", true);
}

// draw Line
function createLineShape(data, scales) {
  const line = d3
    .line()
    .x((d) => scales.xScale(d.date))
    .y((d) => scales.yScale(d.close));

  // Draw
  ctr
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "var(--color-positive)")
    .attr("stroke-width", 2)
    .attr("d", line);
}

// Create Shape area for gradient
function createLinearGradient(data, scales) {
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
    .x((d) => scales.xScale(d.date))
    .y0(height)
    .y1((d) => scales.yScale(d.close));
  ctr
    .append("path")
    .datum(data)
    .attr("stroke", "none")
    .attr("fill", "url(#area-gradient)")
    .attr("d", area);
}

// Get all tooltips Elelments
function getTooltipElements() {
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
    .attr("y", 15);

  // Add tspan elements for date and close
  const tooltipClose = tooltipText
    .append("tspan")
    .style("fill", "var(--color-text-primary)");
  const tooltipDate = tooltipText.append("tspan");

  // Green Dot on the shape
  const tooltipDot = ctr
    .append("circle")
    .attr("r", 4)
    .attr("fill", "var(--color-positive)")
    .attr("stroke", "none")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // Dashed Line
  const tooltipLine = ctr
    .append("line")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", margin.top * 2)
    .attr("y2", height)
    .attr("stroke", "var(--color-text-ternary)")
    .attr("stroke-dasharray", 3)
    .attr("opacity", 0)
    .style("pointer-events", "none");

  return {
    tooltip,
    tooltipText,
    tooltipClose,
    tooltipDate,
    tooltipDot,
    tooltipLine,
  };
}

//Handle tooltip Mouvement
function handleTooltipmouvement(data, scales, tooltipElements) {
  const {
    tooltip,
    tooltipText,
    tooltipClose,
    tooltipDate,
    tooltipDot,
    tooltipLine,
  } = tooltipElements;
  // Add event listener to move tooltip
  ctr
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("opacity", 0)
    .on("mousemove touchmove", (event) => {
      const [currentX, currentY] = d3.pointer(event, ctr.node());
      const currentDate = scales.xScale.invert(currentX);
      const topMarge = 12;
      const bottomMarge = height - margin.bottom - 6;

      const bisector = d3.bisector((d) => d.date).left;
      const index = bisector(data, currentDate);
      const currentElt = data[index - 1];

      tooltipDot
        .style("opacity", 1)
        .attr("cx", scales.xScale(currentElt.date))
        .attr("cy", scales.yScale(currentElt.close));

      tooltip.attr("opacity", 1);

      const formattedClose = currentElt.close.toFixed(2);
      const formattedDate = PeriodConfig[period].tooltipDateFormat(
        currentElt.date
      );

      tooltipClose.text(formattedClose + space + "USD" + space + space + space);
      tooltipDate.text(formattedDate);

      // Calculate tooltip dimensions for tooltip dynamic width
      const textBBox = tooltipText.node().getBBox();
      const tooltipWidth = textBBox.width + 16;
      const tooltipHeight = 22;

      tooltip
        .select("rect")
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight);

      // Verify if the tooltip is hiding the dot
      const isNotHiddingDot =
        topMarge + tooltipHeight + 5 > scales.yScale(currentElt.close)
          ? true
          : false;

      // Position the tooltip
      let tooltipX = scales.xScale(currentElt.date) - tooltipWidth / 2;
      tooltipX = Math.max(-2, Math.min(width - tooltipWidth, tooltipX));
      const tooltipY = isNotHiddingDot ? bottomMarge : topMarge;

      tooltip.attr("transform", `translate(${tooltipX}, ${tooltipY})`).raise();

      //Line tooltip
      tooltipLine
        .attr("opacity", 0.7)
        .attr("x1", scales.xScale(currentElt.date))
        .attr("x2", scales.xScale(currentElt.date))
        .attr("y1", isNotHiddingDot ? margin.top : margin.top * 2)
        .attr("y2", isNotHiddingDot ? height - margin.top * 2 : height);
    });
}

let period = "1d";

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
    period = e.target.dataset.period;
  }

  ctr.selectAll("*").remove();
  draw(period);
}

// Main Function
async function draw() {
  // Get datas
  const data = await fetchData(period);

  // Get start and end date
  const startDate = data[0].date;
  const endDate = data[data.length - 1].date;

  // Get Scales
  const scales = setupScales(data, startDate, endDate, period);

  // Draw Axis
  createAxes(scales, period, data);

  //Draw Line Shape
  createLineShape(data, scales);

  // Liniear gradient
  createLinearGradient(data, scales);

  // Tooltip elements
  const tooltipElements = getTooltipElements();

  handleTooltipmouvement(data, scales, tooltipElements);
}

draw(period);
