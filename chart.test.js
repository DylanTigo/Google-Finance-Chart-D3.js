import { chart } from './index';

describe('D3.js Chart Performance', () => {

  test('Large Data Handling', async () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      date: new Date(`2023-01-${i % 28 + 1}`),
      close: Math.random() * 100,
    }));

    const scales = chart.setupScales(largeData);
    chart.createAxes(scales, largeData);
    chart.createLineShape(largeData, scales);
    chart.createLinearGradient(largeData, scales);
    const tooltipElements = chart.createTooltip();
    chart.handleTooltipElement(largeData, scales, tooltipElements);

    expect(console.log).toHaveBeenCalledWith('The chart handles large data sets efficiently.');
  });
});