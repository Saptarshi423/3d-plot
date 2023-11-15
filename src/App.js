import React, { useEffect, useRef, useState } from "react";
import Plot from "react-plotly.js";
import { GetRollData, TransposeArray } from "./RollDataSource";
import { colorScale7 } from "./RollDataSource";

const colorBackground = "#000";
const colorForeground = "#FFF";
const colorGrid = "#555";

const Title_XAxis = "CD Position";
const Title_YAxis = "MD Distance";
const Title_ZAxis = "Thickness";

const Axis_X_Start = 0;
const Axis_X_End = 0.78;
const Axis_X2_Start = 0.8;
const Axis_X2_End = 1;
const Axis_Y_Start = 0;
const Axis_Y_End = 0.78;
const Axis_Y2_Start = 0.8;
const Axis_Y2_End = 1;

//Storage for mouse events
let lastDoubleClickTime = Date.now() - 10000; //Initialise double click time to something recent
let clickPos_Previous = undefined;
let clickPos_Last = undefined;

const App = () => {
  const graphRef = useRef();
  const [SERIES, SET_SERIES] = useState([]);
  const [DATA, SET_DATA] = useState([]);
  const [SETTINGS, SET_SETTINGS] = useState(null);
  const [LAYOUT, SET_LAYOUT] = useState(null);
  const [X_DATA, SET_X_DATA] = useState(null);
  const [Y_DATA, SET_Y_DATA] = useState(null);
  const [X_SETTINGS, SET_X_SETTINGS] = useState({
    dataSettingsX: null,
    dataLayersX: null,
  });
  const [Y_SETTINGS, SET_Y_SETTINGS] = useState({
    dataSettingsY: null,
    dataLayersY: null,
  });

  const drawChart = (mapData) => {
    let mapDataTransposed = TransposeArray(mapData);
    let xData = [];
    let yData = [];
    //Create dummy X and Y data
    for (let i = 0; i < mapData[0].length; i++) xData.push(i * 10);
    for (let i = 0; i < mapData.length; i++) yData.push(i * 100);

    SET_X_DATA(xData);
    SET_Y_DATA(yData);

    // Create data for the main graph
    const dataMainSeries = {
      z: mapData,
      type: "surface",
      colorbar: {
        tickcolor: colorForeground,
        tickfont: { color: colorForeground },
      },
      contours: {
        x: { highlight: false },
        y: { highlight: false },
        z: { highlight: false },
      },
      showscale: true,
    };

    // Apply color scale to the main series
    colorScale7.ApplyScaleToSeries(dataMainSeries);

    //Create array of layers for the X series graph
    //NOTE: After creation need to change the yaxis values to y2 and hide hover info
    let dataSettingsX = {
      xData: xData,
      yData: mapData[0],
    };
    let dataLayersX = colorScale7.BuildMultiColorTraces(dataSettingsX);
    dataLayersX.forEach(function (value, index) {
      value.yaxis = "y2";
      //value.hoverinfo = "none";
    });

    //Create array of layers for the Y series graph
    //NOTE: After creation need to change the xaxis values to x2 and hide hover info
    let dataSettingsY = {
      xData: yData,
      yData: mapDataTransposed[0],
      transpose: true,
    };
    let dataLayersY = colorScale7.BuildMultiColorTraces(dataSettingsY);
    dataLayersY.forEach(function (value, index) {
      value.xaxis = "x2";
      //value.hoverinfo = "none";
    });

    //Create data array
    const dataMain = [dataMainSeries];
    dataMain.push(...dataLayersX);
    dataMain.push(...dataLayersY);

    SET_X_SETTINGS({ dataSettingsX: dataSettingsX, dataLayersX: dataLayersX });
    SET_Y_SETTINGS({ dataSettingsY: dataSettingsY, dataLayersY: dataLayersY });

    console.log({ dataMain, dataLayersX, dataLayersY });

    //Create shapes array
    // let shapes = [];
    // // Create split lines and add to array
    // var splitLine_V = {
    //   type: "line",
    //   xref: "x",
    //   yref: "paper",
    //   y0: Axis_Y_Start,
    //   y1: Axis_Y_End,
    //   x0: 10,
    //   x1: 20,
    //   line: {
    //     color: "white",
    //     width: 3,
    //     dash: "dash",
    //   },
    // };
    // var splitLine_H = {
    //   type: "line",
    //   xref: "paper",
    //   yref: "y",
    //   x0: Axis_X_Start,
    //   x1: Axis_X_End,
    //   y0: 10,
    //   y1: 20,
    //   line: {
    //     color: "white",
    //     width: 3,
    //     dash: "dash",
    //   },
    // };
    // shapes.push(splitLine_V, splitLine_H);

    // Layout
    let layout = {
      margin: {
        t: 10,
        b: 50,
      },
      //shapes: shapes,
      scene: {
        camera: {
          eye: { x: 1.2, y: 1.2, z: 0.8 }, // Isometric view
        },
        xaxis: {
          color: colorForeground,
          gridcolor: colorGrid,
          showspikes: false,
          title: { text: Title_XAxis },
          showgrid: false,
          zeroline: false,
        },
        yaxis: {
          color: colorForeground,
          gridcolor: colorGrid,
          showspikes: false,
          title: { text: Title_YAxis },
          showgrid: false,
          zeroline: false,
        },
        zaxis: {
          color: colorForeground,
          gridcolor: colorGrid, // Set the color of the z-axis gridlines
          showspikes: false,
          title: { text: Title_ZAxis },
          showgrid: false,
          zeroline: false,
        },
      },
      xaxis: {
        color: "black",
        gridcolor: colorGrid,
        showspikes: false,
        title: { text: Title_XAxis },
        showgrid: false,
      },
      yaxis: {
        color: "black",
        gridcolor: colorGrid,
        showspikes: false,
        title: { text: Title_YAxis },
        showgrid: false,
      },
      zaxis: {
        //color: colorForeground,
        gridcolor: colorGrid,
        showspikes: false,
        title: { text: Title_ZAxis },
        showgrid: false,
      },
      xaxis2: {
        domain: [Axis_X2_Start, Axis_X2_End],
        color: colorForeground,
        gridcolor: colorGrid,
        title: { text: Title_ZAxis },
        range: [dataSettingsY.range.min, dataSettingsY.range.max],
      },
      yaxis2: {
        domain: [Axis_Y2_Start, Axis_Y2_End],
        color: colorForeground,
        gridcolor: colorGrid,
        title: { text: Title_ZAxis },
        range: [dataSettingsX.range.min, dataSettingsX.range.max],
      },

      paper_bgcolor: colorBackground,
      plot_bgcolor: colorBackground,
      datarevision: 1,
      hovermode: true,
    };

    // Settings
    let settings = {
      displaylogo: false,
      displayModeBar: false,
      responsive: false,
    };

    SET_DATA(dataMain);
    SET_LAYOUT(layout);
    SET_SETTINGS(settings);
    SET_SERIES(mapData);
  };

  const updateGraphOptions = (showScale = false, isBlended = false) => {
    let currentGraphProps = graphRef.current.props;
    let isScaleVisible = graphRef.current.props.data[0].showscale;

    graphRef.current.props.data[0].showscale =
      showScale === true ? !isScaleVisible : isScaleVisible;

    if (!showScale) {
      currentGraphProps.layout.datarevision += 1;
      colorScale7.SetBlended(isBlended);
    }
    // // Get blended optio
    // Update color scale and re-apply
    //colorScale7.SetBoundaries([14, 16.5, 17, 19, 20, 22]);
    // colorScale7.SetBlended(blended);
    colorScale7.ApplyScaleToSeries(graphRef.current.props.data[0]);

    // Redraw the new chart.
    SET_DATA([...currentGraphProps.data]);
    SET_LAYOUT(currentGraphProps.layout);
    SET_SETTINGS(currentGraphProps.config);
  };

  const handleClick = ({ points }) => {
    // //Ignore clicks that are not on the main graph
    if (points[0].data.z === undefined) return;
    //Check if this click is part of a double click event by checking delta to last double click time
    var clickDelta = Date.now() - lastDoubleClickTime;
    if (clickDelta < 200) {
      //Assume this click is part of a double click
      //Restore the previous x and y positions
      clickPos_Last = clickPos_Previous;
      var x = clickPos_Previous.x;
      var y = clickPos_Previous.y;
      ShowSections(x, y, true);
    } else {
      //Valid click so move to new location
      ShowSections(points[0].x, points[0].y, true);
    }
  };

  //Show sections
  function ShowSections(x, y, refresh) {
    try {
      let currentGraphProps = graphRef.current.props;
      let mapData = SERIES;
      let mapDataTransposed = TransposeArray(mapData);
      //Update last position from current position and save last position
      clickPos_Previous = clickPos_Last;
      clickPos_Last = { x: x, y: y };
      //Update the location of the lines
      // splitLine_V.x0 = x;
      // splitLine_V.x1 = x;
      // splitLine_H.y0 = y;
      // splitLine_H.y1 = y;
      //Find x and y positions in series
      var xPos = X_DATA.findIndex(function (value) {
        return value >= x;
      });
      var yPos = Y_DATA.findIndex(function (value) {
        return value >= y;
      });
      //Change the series shown on each side graph
      X_SETTINGS.dataSettingsX.yData = mapData[yPos];
      X_SETTINGS.dataLayersX = colorScale7.BuildMultiColorTraces(
        X_SETTINGS.dataSettingsX,
        X_SETTINGS.dataLayersX
      );
      Y_SETTINGS.dataSettingsY.yData = mapDataTransposed[xPos];
      Y_SETTINGS.dataLayersY = colorScale7.BuildMultiColorTraces(
        Y_SETTINGS.dataSettingsY,
        Y_SETTINGS.dataLayersY
      );
      //Update ranges
      currentGraphProps.layout.xaxis2.range = [
        Y_SETTINGS.dataSettingsY.range.min,
        Y_SETTINGS.dataSettingsY.range.max,
      ];
      currentGraphProps.layout.yaxis2.range = [
        X_SETTINGS.dataSettingsX.range.min,
        X_SETTINGS.dataSettingsX.range.max,
      ];

      //Redraw.
      SET_DATA([...currentGraphProps.data]);
      SET_LAYOUT(currentGraphProps.layout);
      SET_SETTINGS(currentGraphProps.config);
    } catch (error) {
      console.error(error);
    }
  }

  useState(() => {
    // Get mapData
    const mapData = GetRollData();
    drawChart(mapData);
  }, []);

  return (
    <div style={{ width: "100%", height: "80vh" }}>
      <div id="graphDiv" style={{ width: "100%", height: "100%" }}>
        <Plot
          ref={graphRef}
          data={DATA}
          layout={LAYOUT}
          config={SETTINGS}
          onClick={(e) => {
            handleClick(e);
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <br></br>
      <div id="OptionsArea">
        <label htmlFor="showScale" style={{ fontSize: "larger" }}>
          Show scale
        </label>
        <input
          style={{ width: "35px", height: "20px" }}
          type="checkbox"
          id="showScale"
          onChange={() => {
            updateGraphOptions(true);
          }}
          defaultChecked
        />
        <label htmlFor="blendedScale" style={{ fontSize: "larger" }}>
          Blended scale
        </label>
        <input
          style={{ width: "35px", height: "20px" }}
          type="checkbox"
          id="blendedScale"
          onChange={(e) => {
            updateGraphOptions(false, e.target.checked);
          }}
        />
      </div>
    </div>
  );
};

export default App;
