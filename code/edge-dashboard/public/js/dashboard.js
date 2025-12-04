(function () {
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (window.Chart) {
        window.Chart.defaults.devicePixelRatio = devicePixelRatio;
    }

    const initialLabels = [];

    function createLineChart(canvasId, datasets, options = {}) {
        const canvasContext = document.getElementById(canvasId)?.getContext('2d');
        if (!canvasContext) return null;

        const defaultChartOptions = {
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            layout: { padding: 4 },
            scales: {
                x: {
                    display: true,
                    grid: { display: false },
                    border: { display: true, color: '#e5e7eb', width: 1 },
                    ticks: { display: false }
                },
                y: {
                    ticks: {
                        display: true,
                        color: '#6b7280',
                        font: { size: 10 }
                    },
                    border: { display: true, color: '#e5e7eb', width: 1 },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { labels: { color: '#111827', boxWidth: 10, font: { size: 10 } } },
                tooltip: {
                    mode: 'nearest',
                    intersect: false,
                    callbacks: {
                        title: function (context) {
                            const dataIndex = context[0].dataIndex;
                            const chartInstance = context[0].chart;
                            const originalLabel = chartInstance._originalLabels?.[dataIndex];
                            return originalLabel ? originalLabel : context[0].label;
                        }
                    }
                }
            },
            elements: { point: { radius: 0 }, line: { borderWidth: 1.6, spanGaps: true } }
        };

        if (options.scales?.y) {
            defaultChartOptions.scales.y = {
                ...defaultChartOptions.scales.y,
                ...options.scales.y,
                grid: { display: false },
                border: { display: true, color: '#e5e7eb', width: 1 },
                ticks: {
                    ...defaultChartOptions.scales.y.ticks,
                    ...options.scales.y.ticks
                }
            };
        }

        const finalChartOptions = {
            ...defaultChartOptions,
            ...options,
            scales: {
                ...defaultChartOptions.scales,
                ...options.scales,
                y: defaultChartOptions.scales.y
            },
            plugins: {
                ...defaultChartOptions.plugins,
                ...options.plugins
            }
        };

        return new Chart(canvasContext, {
            type: 'line',
            data: { labels: initialLabels, datasets },
            options: finalChartOptions
        });
    }

    function resizeChartCanvases() {
        document.querySelectorAll('.chart-area canvas').forEach(canvasElement => {
            const parentElement = canvasElement.parentElement;
            if (!parentElement) return;
            const parentRect = parentElement.getBoundingClientRect();
            const parentWidth = Math.floor(parentRect.width);
            const parentHeight = Math.floor(parentRect.height);

            if (parentWidth > 0 && parentHeight > 0) {
                const needsResize = canvasElement.width !== parentWidth * devicePixelRatio || canvasElement.height !== parentHeight * devicePixelRatio;
                if (needsResize) {
                    canvasElement.width = parentWidth * devicePixelRatio;
                    canvasElement.height = parentHeight * devicePixelRatio;
                    canvasElement.style.width = parentWidth + 'px';
                    canvasElement.style.height = parentHeight + 'px';
                }
            }
        });
    }

    window.addEventListener('resize', () => {
        resizeChartCanvases();
        [glucoseChart, heartRateChart, spo2Chart, tempChart, bpChart, respRateChart].forEach(chart => chart && chart.resize());
    });
    resizeChartCanvases();

    const metricRanges = {
        hr: { min: 40, max: 200, step: 20 },
        spo2: { min: 80, max: 100, step: 2 },
        temp: { min: 34, max: 41, step: 0.5 },
        rr: { min: 8, max: 40, step: 4 },
        gluco: { min: 60, max: 200, step: 20 },
        bp: { min: 40, max: 200, step: 20 }
    };

    function getYScaleConfiguration(metricKey) {
        const range = metricRanges[metricKey];
        return range ? {
            min: range.min,
            max: range.max,
            ticks: {
                display: true,
                stepSize: range.step,
                color: '#6b7280',
                font: { size: 10 },
                callback: (value) => (Number.isInteger(range.step) ? value : Number(value).toFixed((range.step + '').includes('.') ? (range.step + '').split('.')[1].length : 0))
            },
            grid: { display: false },
            border: { display: false }
        } : {};
    }

    const hideLegendOption = { plugins: { legend: { display: false } } };
    const glucoseChart = createLineChart('chart-gluco', [{ label: 'Glucose', data: [], tension: 0.4 }], { scales: { y: getYScaleConfiguration('gluco') }, ...hideLegendOption });
    const heartRateChart = createLineChart('chart-hr', [{ label: 'HR', data: [], tension: 0.4 }], { scales: { y: getYScaleConfiguration('hr') }, ...hideLegendOption });
    const spo2Chart = createLineChart('chart-spo2', [{ label: 'SpO₂', data: [], tension: 0.4 }], { scales: { y: getYScaleConfiguration('spo2') }, ...hideLegendOption });
    const tempChart = createLineChart('chart-temp', [{ label: 'Temp', data: [], tension: 0.4 }], { scales: { y: getYScaleConfiguration('temp') }, ...hideLegendOption });
    const respRateChart = createLineChart('chart-rr', [{ label: 'RR', data: [], tension: 0.4 }], { scales: { y: getYScaleConfiguration('rr') }, ...hideLegendOption });
    const bpChart = createLineChart('chart-bp', [
        { label: 'Sys', data: [], tension: 0.4, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.18)', fill: false },
        { label: 'Dia', data: [], tension: 0.4, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.18)', fill: false }
    ], { scales: { y: getYScaleConfiguration('bp') } });

    const heartRateElement = document.getElementById('tile-hr');
    const bloodPressureElement = document.getElementById('tile-bp');
    const spo2Element = document.getElementById('tile-spo2');
    const tempElement = document.getElementById('tile-temp');
    const respRateElement = document.getElementById('tile-rr');
    const glucoseElement = document.getElementById('tile-gluco');

    const urlParameters = new URLSearchParams(location.search);
    const activeSessionId = urlParameters.get('sessionId');

    async function refreshMetrics() {
        try {
            const response = await fetch('/api/metrics/recent' + (activeSessionId ? ('?sessionId=' + encodeURIComponent(activeSessionId)) : ''));
            const metricsData = await response.json();

            if (heartRateElement) heartRateElement.textContent = metricsData.summary.hr ?? '--';
            if (bloodPressureElement) {
                const { bp_sys, bp_dia } = metricsData.summary;
                bloodPressureElement.textContent = (bp_dia != null && bp_sys != null)
                    ? `${bp_dia}/${bp_sys}`
                    : '--/--';
            }

            if (spo2Element) spo2Element.textContent = metricsData.summary.spo2 ?? '--';
            if (tempElement) tempElement.textContent = metricsData.summary.temp ?? '--';
            if (respRateElement) respRateElement.textContent = metricsData.summary.rr ?? '--';
            if (glucoseElement) glucoseElement.textContent = metricsData.summary.gluco ?? '--';

            const windowDurationMinutes = metricsData.windowMinutes || 5;
            const currentTime = Date.now();
            const startTime = currentTime - windowDurationMinutes * 60 * 1000;

            const timeTicksSeconds = [];
            for (let t = Math.floor(startTime / 1000); t <= Math.floor(currentTime / 1000); t++) timeTicksSeconds.push(t);

            const formatAxisLabel = () => '';
            const formatTooltipLabel = seconds => new Date(seconds * 1000).toLocaleTimeString();

            function buildDataWindow(dataSeries) {
                const dataMap = new Map();
                for (let i = 0; i < dataSeries.labels.length; i++) {
                    const rawTimestamp = dataSeries.labels[i];
                    const timestampMs = typeof rawTimestamp === 'string' ? Date.parse(rawTimestamp) : Number(rawTimestamp);
                    if (!Number.isFinite(timestampMs)) continue;
                    const timestampSec = Math.floor(timestampMs / 1000);
                    if (timestampSec >= Math.floor(startTime / 1000) && timestampSec <= Math.floor(currentTime / 1000)) {
                        dataMap.set(timestampSec, dataSeries.data[i]);
                    }
                }
                const windowValues = timeTicksSeconds.map(sec => dataMap.has(sec) ? dataMap.get(sec) : null);
                return {
                    labels: timeTicksSeconds.map(formatAxisLabel),
                    originalLabels: timeTicksSeconds.map(formatTooltipLabel),
                    data: windowValues
                };
            }

            const updateSingleChart = (chartInstance, dataSeries) => {
                if (!chartInstance) return;
                const windowData = buildDataWindow(dataSeries);
                chartInstance.data.labels = windowData.labels;
                chartInstance._originalLabels = windowData.originalLabels;
                chartInstance.data.datasets[0].data = windowData.data;
                chartInstance.update('none');
                return windowData;
            };

            const glucoseWindow = updateSingleChart(glucoseChart, metricsData.gluco);
            const heartRateWindow = updateSingleChart(heartRateChart, metricsData.hr);
            const spo2Window = updateSingleChart(spo2Chart, metricsData.spo2);
            const tempWindow = updateSingleChart(tempChart, metricsData.temp);
            const respRateWindow = updateSingleChart(respRateChart, metricsData.rr);

            if (bpChart) {
                const sysWindow = buildDataWindow(metricsData.bp_sys);
                const diaWindow = buildDataWindow(metricsData.bp_dia);
                bpChart.data.labels = sysWindow.labels;
                bpChart._originalLabels = sysWindow.originalLabels;
                bpChart.data.datasets[0].data = sysWindow.data;
                bpChart.data.datasets[1].data = diaWindow.data;
                bpChart.update('none');
            }

            function getLastNonNullValue(array) {
                for (let i = array.length - 1; i >= 0; i--) { if (array[i] != null) return array[i]; }
                return null;
            }

            if (heartRateElement && (metricsData.summary.hr == null)) heartRateElement.textContent = getLastNonNullValue(heartRateWindow?.data || []) ?? 0;
            if (spo2Element && (metricsData.summary.spo2 == null)) spo2Element.textContent = getLastNonNullValue(spo2Window?.data || []) ?? 0;
            if (tempElement && (metricsData.summary.temp == null)) tempElement.textContent = getLastNonNullValue(tempWindow?.data || []) ?? 0;
            if (respRateElement && (metricsData.summary.rr == null)) respRateElement.textContent = getLastNonNullValue(respRateWindow?.data || []) ?? 0;
            if (glucoseElement && (metricsData.summary.gluco == null)) glucoseElement.textContent = getLastNonNullValue(glucoseWindow?.data || []) ?? 0;
            if (bloodPressureElement && (metricsData.summary.bp_sys == null || metricsData.summary.bp_dia == null)) {
                const sysFallback = getLastNonNullValue((metricsData.bp_sys?.data) || []) ?? 0;
                const diaFallback = getLastNonNullValue((metricsData.bp_dia?.data) || []) ?? 0;
                bloodPressureElement.textContent = `${diaFallback}/${sysFallback}`;
            }
        } catch (error) {
            window.IoTToasts?.show(error.message, { variant: 'danger', delay: 5000 });
        }
    }

    refreshMetrics();
    setInterval(refreshMetrics, 1000);
})();