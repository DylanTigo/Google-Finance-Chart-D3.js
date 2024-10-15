async function draw() {
  const filter = ["1d", "5d", "1m", "6m", "1y", "5y", "max"];
  const ticks1D = [
    new Date(2022, 0, 1, 10, 00),
    new Date(2022, 0, 1, 12, 00),
    new Date(2022, 0, 1, 14, 00),
    new Date(2022, 0, 1, 16, 00),
    new Date(2022, 0, 1, 18, 00),
    new Date(2022, 0, 1, 20, 00),
  ];

  const hourFormat = d3.timeFormat("%H:%M");
  const formatInteger = d3.format(".0f");

  const data = await d3.csv("datas/1D.csv", (d) => {
    return {
      date: hourFormat(new Date(d.Datetime)),
      close: +Number(d.Close).toFixed(2),
    };
  });
  const xAccessor = (d) => d.date;
  const yAccessor = (d) => d.close;

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
    .scaleTime()
    .domain([new Date(2022, 0, 1, 9, 30), new Date(2022, 0, 1, 20, 30)])
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
    .ticks(5)
    .tickSizeOuter(0);
  ctr.append("g").classed("y-axis", true).call(yAxis);

  //Styling Axis
  ctr.select(".y-axis .domain").remove();
  ctr.selectAll(".y-axis .tick line").attr("x2", width);
  ctr.selectAll(".tick text").style("font-size", "12px");

  console.log(data);
  

  // Lines
  const line = d3
    .line()
    .x((d) => xScale(d.date))
    .y((d) => yScale(formatInteger(d.close)));

  ctr
    .append("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("d", line(data));
}

draw();
