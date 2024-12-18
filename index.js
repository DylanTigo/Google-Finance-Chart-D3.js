const margin = { top: 10, bottom: 20, left: 30, right: 40 };
const parseDate = d3.utcParse("%Y-%m-%d %H:%M:%S%Z");

const PERIOD_CONFIG = {
  "1d": {
    tickFormat: ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
    tooltipDateFormat: d3.timeFormat("%H:%M"),
    dataFile: "datas/1D.csv",
    gapTicksY: 1,
    tickValues: [2, 10, 18, 26, 34, 42],
  },
  "5d": {
    tickFormat: d3.timeFormat("%d %b"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b %H:%M"),
    dataFile: "datas/5D.csv",
    gapTicksY: 3,
    generateTicks: (startDate, endDate) => {
      return d3.timeDay
        .range(startDate, endDate)
        .filter((d) => d.getTime() !== startDate.getTime())
        .map((d) => {
          d.setHours(9, 30);
          return new Date(d);
        });
    },
  },
  "1m": {
    tickFormat: d3.timeFormat("%d %b"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b"),
    dataFile: "datas/1M.csv",
    gapTicksY: 10,
    generateTicks: (startDate, endDate) => {
      return d3.timeMonday
        .range(startDate, endDate)
        .filter((d) => d.getTime() !== startDate.getTime());
    },
    tickFinder: (data, tick) => {
      return data.find((d) => d.date.getDay() === tick.getDay());
    },
  },
  "6m": {
    tickFormat: d3.timeFormat("%b %Y"),
    tooltipDateFormat: d3.timeFormat("%a, %d %b"),
    dataFile: "datas/6M.csv",
    gapTicksY: 20,
    generateTicks: (startDate, endDate) => {
      return d3.timeMonth
        .range(startDate, endDate, 2)
        .filter((d) => d.getTime() !== startDate.getTime());
    },
    tickFinder: (data, tick) => {
      // Find closiest data to tick
      return data.find((d) => d.date.getMonth() === tick.getMonth());
    },
  },
};

class Chart {
  // Constructor and setup
  constructor(selector) {
    let svg = d3.select(selector);
    this.width = svg.node().clientWidth - margin.right;
    this.height = svg.node().clientHeight - margin.bottom;
    this.container = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`);
    this.period = "1d";
    this.setupEventListeners();
  }

  // Draw chart
  async init() {
    await this.draw();
  }

  // Setup event listeners
  setupEventListeners() {
    const buttons = document.querySelectorAll(".btn");
    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        const buttons = document.querySelectorAll(".btn");
        const active = event.target.classList.contains("active");

        if (!active) {
          buttons.forEach((button) => button.classList.remove("active"));
          event.target.classList.add("active");
          this.period = event.target.dataset.period;
          this.container.selectAll("*").remove();
          this.draw();
        }
      });
    });
  }

  // Fetch data
  async fetchData() {
    return d3.csv(PERIOD_CONFIG[this.period].dataFile, (d, i) => {
      const date = d.Datetime.slice(0, 19);
      return {
        id: i,
        date: new Date(date),
        close: +d.Close,
      };
    });
  }

  // Generate ticks for Y axis
  generateTicksY(minData, maxData, gap) {
    const minTick = Math.floor(minData / gap) * gap;
    const maxTick = Math.ceil(maxData / gap) * gap;
    const ticks = [];

    for (let i = minTick; i <= maxTick; i += gap) {
      ticks.push(i);
    }
    return ticks;
  }

  // Setup scales
  setupScales(data, startDate, endDate) {
    const periodConfig = PERIOD_CONFIG[this.period];

    // get ticks
    let ticksX;
    if (this.period === "1d") {
      ticksX = periodConfig.tickValues;
    } else {
      const ticks = periodConfig.generateTicks(startDate, endDate);
      ticksX = ticks.map((tick) => {
        let idValue = data.find((d) => d.date.getTime() === tick.getTime());
        if (!idValue) {
          idValue = periodConfig.tickFinder(data, tick);
        }
        return idValue.id;
      });
    }

    // get ticks Y
    const ticksY = this.generateTicksY(
      d3.min(data, (d) => d.close),
      d3.max(data, (d) => d.close),
      periodConfig.gapTicksY
    );

    const yMin = ticksY[0];
    const yMax = ticksY[ticksY.length - 1];
    const domainMax = this.period === "1d" ? 44 : data.length - 1;

    // Setup scales
    const xScale = d3
      .scaleLinear()
      .domain([0, domainMax])
      .range([0, this.width - 2]);

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([this.height, margin.top])
      .nice();

    return { xScale, yScale, ticksX, ticksY };
  }

  // Create axes
  createAxes(scales, data) {
    const { xScale, yScale, ticksX, ticksY } = scales;
    const periodConfig = PERIOD_CONFIG[this.period];

    // Setup axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(ticksX)
      .tickFormat((d, i) => {
        return this.period === "1d"
          ? periodConfig.tickFormat[i]
          : periodConfig.tickFormat(data[d].date);
      })
      .tickSizeOuter(0);

    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat(d3.format("d"))
      .tickValues(ticksY)
      .tickSizeOuter(0);

    // Draw axes
    this.container
      .append("g")
      .attr("transform", `translate(0, ${this.height})`)
      .call(xAxis);

    this.container.append("g").classed("y-axis", true).call(yAxis);

    // Style axes
    this.container.selectAll(".domain").remove();
    this.container
      .selectAll(".y-axis .tick line")
      .attr("x2", this.width)
      .classed("chart-line", true);
    this.container
      .selectAll(".tick text")
      .style("font-size", "13px")
      .classed("chart-text", true);
  }

  // Create line shape
  createLineShape(data, scales) {
    const line = d3
      .line()
      .x((d) => scales.xScale(d.id))
      .y((d) => scales.yScale(d.close));

    const line1 = d3
      .line()
      .x((d) => scales.xScale(d.id))
      .y(this.height);

    this.container
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "var(--color-positive)")
      .attr("stroke-width", 2)
      .attr("d", line1)
      .transition()
      .duration(500)
      .attr("d", line);
  }

  // Create linear gradient
  createLinearGradient(data, scales) {
    const defs = this.container.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "linear-gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--color-gradiant-top)")
      .attr("stop-opacity", 0.3);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "var(--color-gradiant-bottom)")
      .attr("stop-opacity", 0);

    this.container
      .append("mask")
      .attr("id", "mask-area")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", "100%")
      .attr("height", this.height)
      .attr("fill", "white");

    const area = d3
      .area()
      .x((d) => scales.xScale(d.id))
      .y0(this.height)
      .y1((d) => scales.yScale(d.close));
    const area1 = d3
      .area()
      .x((d) => scales.xScale(d.id))
      .y0(this.height)
      .y1(this.height);

    this.container
      .append("path")
      .attr("id", "shape-area")
      .datum(data)
      .attr("stroke", "none")
      .attr("fill", "url(#linear-gradient)")
      .attr("d", area1)
      .transition()
      .duration(500)
      .attr("d", area)
      .attr("mask", "url(#mask-area)");
  }

  // Create tooltip
  createTooltip() {
    const tooltip = this.container
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

    const tooltipDot = this.container
      .append("circle")
      .attr("r", 4)
      .attr("fill", "var(--color-positive)")
      .attr("stroke", "none")
      .style("opacity", 0)
      .style("pointer-events", "none");

    const tooltipLine = this.container
      .append("line")
      .classed("tooltip-line", true)
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", margin.top * 2)
      .attr("y2", this.height)
      .attr("stroke", "var(--color-text-ternary)")
      .attr("stroke-dasharray", 3)
      .attr("opacity", 0)
      .style("pointer-events", "none");

    // Brush Elements
    const dragDot = this.container
      .append("circle")
      .attr("r", 4)
      .attr("fill", "var(--color-positive)")
      .attr("stroke", "none")
      .style("opacity", 0)
      .style("pointer-events", "none");

    const dragLine = this.container
      .append("line")
      .classed("drag-line", true)
      .attr("x1", 0)
      .attr("x2", 0)
      .attr("y1", margin.top * 2)
      .attr("y2", this.height)
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
      dragDot,
      dragLine,
    };
  }

  // Handle tooltip elments
  handleTooltipElement(data, scales, tooltipElements) {
    const {
      tooltip,
      tooltipText,
      tooltipClose,
      tooltipDate,
      tooltipDot,
      tooltipLine,
      dragDot,
      dragLine,
    } = tooltipElements;
    const { xScale, yScale } = scales;
    const periodConfig = PERIOD_CONFIG[this.period];
    let startElt;
    let currentElt;
    let isOnDrag = false;
    const dragMask = this.container.select("#mask-area rect");
    const space = "\u00A0";

    const updateTooltipContent = () => {
      if (isOnDrag) {
        const { priceDifference, percentage } = calculatePriceDifference(
          xScale(startElt.close),
          xScale(currentElt.close)
        );

        let fillColor;
        let tooltipText;
        if (priceDifference > 0) {
          fillColor = "var(--color-positive)";
          tooltipText = `+${priceDifference}${space}(${percentage}%)${space}▲${space}${space}`;
        } else if (priceDifference < 0) {
          fillColor = "var(--color-negative)";
          tooltipText = `${priceDifference}${space}(${percentage}%)${space}▼${space}${space}`;
        } else {
          fillColor = "var(--color-text-ternary)";
          tooltipText = `${priceDifference}${space}(${percentage}%)${space}${space}`;
        }
        tooltipClose.style("fill", fillColor).text(tooltipText);

        const formattedCurrentDate = periodConfig.tooltipDateFormat(
          currentElt.date
        );
        const formattedStartDate = periodConfig.tooltipDateFormat(
          startElt.date
        );
        tooltipDate.text(
          xScale(currentElt.id) < xScale(startElt.id)
            ? `${formattedCurrentDate}${space}-${space}${formattedStartDate}`
            : `${formattedStartDate}${space}-${space}${formattedCurrentDate}`
        );
      } else {
        const formattedClose = currentElt.close.toFixed(2);
        const formattedDate = periodConfig.tooltipDateFormat(currentElt.date);
        tooltipClose.text(`${formattedClose}${space}USD${space}${space}`);
        tooltipDate.text(formattedDate);
      }
    };


    // Calculate price difference and percentage
    const calculatePriceDifference = (startEltX, curentEltX) => {
      const min = Math.min(startEltX, curentEltX);
      const max = Math.max(startEltX, curentEltX);

      let priceDifference = curentEltX - startEltX;
      priceDifference = priceDifference.toFixed(2);

      let percentage = (1 - min / max) * 100;
      percentage = percentage.toFixed(2);

      return { priceDifference, percentage };
    };

    this.container
      .append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("opacity", 0)
      .on("mousemove touchmove", (event) => {
        const [currentX] = d3.pointer(event, this.container.node());
        const currentXPosition = xScale.invert(currentX);
        const topMarge = 12;
        const bottomMarge = this.height - margin.bottom - 6;

        currentElt = data[Math.round(currentXPosition)];
        if (currentElt === undefined) return;
        
        // Calculate and set tooltip position 
        const textBBox = tooltipText.node().getBBox();
        const tooltipWidth = textBBox.width + 16;
        const tooltipHeight = 22;
        tooltip
          .select("rect")
          .attr("width", tooltipWidth)
          .attr("height", tooltipHeight);

        // Calculate tooltip position
        const isNotHiddingDot =
          topMarge + tooltipHeight + 5 > yScale(currentElt.close);

        const tooltipY = isNotHiddingDot && !isOnDrag ? bottomMarge : topMarge;
        let tooltipX = xScale(currentElt.id) - tooltipWidth / 2;

        if (isOnDrag) {
          tooltipX =
            xScale(startElt.id) +
            (xScale(currentElt.id) - xScale(startElt.id)) / 2 -
            tooltipWidth / 2;
        }
        tooltipX = Math.max(-2, Math.min(this.width - tooltipWidth, tooltipX));

        // update Tooltip content
        updateTooltipContent()

        // Show and update tooltip
        tooltip
          .attr("opacity", 1)
          .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
          .raise();

        tooltipDot
          .attr("cx", xScale(currentElt.id))
          .attr("cy", yScale(currentElt.close))
          .style("opacity", 1);

        tooltipLine
          .attr("opacity", 0.7)
          .attr("x1", xScale(currentElt.id))
          .attr("x2", xScale(currentElt.id))
          .attr(
            "y1",
            isNotHiddingDot && !isOnDrag ? margin.top : margin.top * 2
          )
          .attr(
            "y2",
            isNotHiddingDot && !isOnDrag
              ? this.height - margin.top * 2
              : this.height
          );

        // Update drag mask
        if (isOnDrag) {
          const startEltX = xScale(startElt.id);
          const curentEltX = xScale(currentElt.id);
          const x = Math.min(curentEltX, startEltX);
          const width = Math.abs(curentEltX - startEltX);
          dragMask.attr("x", x).attr("width", width);
        }
      })
      .on("mousedown touchstart", () => {
        isOnDrag = true;
        startElt = { ...currentElt };
        if (startElt === undefined) return;

        dragDot
          .style("opacity", 1)
          .attr("cx", xScale(startElt.id))
          .attr("cy", yScale(startElt.close));

        dragLine
          .attr("opacity", 1)
          .attr("x1", xScale(startElt.id))
          .attr("x2", xScale(startElt.id));
      })
      .on("mouseup touchend", () => {
        isOnDrag = false;
        dragMask.attr("x", 0).attr("width", "100%");
        dragDot.style("opacity", 0);
        dragLine.attr("opacity", 0);
        tooltipClose.style("fill", "var(--color-text-primary)");
      });
  }

  // Draw chart
  async draw() {
    const data = await this.fetchData();
    const startDate = data[0].date;
    const endDate = data[data.length - 1].date;
    const scales = this.setupScales(data, startDate, endDate);

    this.createAxes(scales, data);
    this.createLineShape(data, scales);
    this.createLinearGradient(data, scales);

    const tooltipElements = this.createTooltip();
    this.handleTooltipElement(data, scales, tooltipElements);
  }
}

// Usage
const chart = new Chart("#chart svg");
chart.init();
