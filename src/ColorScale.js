//================================================================================
//Color scale classes to support coloring of GoYard graphs
//================================================================================

//The color scale is provided an array of n colors and n-1 boundary values that define the boundary between each color
//The class can be used to construct color scales for heatmaps and 3D plots and can also generate a series of scatter series
//to generate multi-colored profile lines
class ColorScale {
  //Internal data
  #mColorsDefault = undefined;
  #mColorsActive = undefined;
  #mBoundaries = undefined;
  #mTarget = undefined;
  #mColorScale = undefined;
  #mBlendedScale = false;

  //Constructor is passed
  //colors      - Array of colors to use (must have at least 2 values)
  //boundaries  - Array of boundary values (must have 1 fewer item than colors), must be an array of numbers with a range greater than 0
  //target      - Optional target value - If undefined will be calculated as the mid point of the boundaries array
  //blended     - Optional boolean value (default false). If true show a blended scale rather than a set of discrete blocks
  //              NOTE: The BuildMultiColorTraces function always uses discrete colors regardless of this setting
  constructor(colors, boundaries, target, blended) {
    //Validate the colors
    if (colors === undefined)
      console.error("GY_ColorScale must be passed array of colors");
    var numberOfColors = colors.length;
    if (numberOfColors < 2)
      console.error(
        "GY_ColorScale must be passed array of colors with at least 2 values"
      );
    this.#mColorsDefault = colors;

    //Save blended setting
    if (blended === undefined) blended = false;
    this.#mBlendedScale = Boolean(blended);

    //Use SetColors to copy defaults to active colors
    this.SetColors();

    //Set the boundaries
    this.SetBoundaries(boundaries);

    //Calculate target value if not provided
    if (target === undefined) {
      //If odd number of boundaries use middle boundary value,
      //otherwise use average of the middle two boundary values
      var numBoundaries = boundaries.length;
      if (numBoundaries % 2 === 0) {
        var index = numBoundaries / 2;
        target = (boundaries[index - 1] + boundaries[index]) / 2;
      } else {
        let index = (numBoundaries - 1) / 2;
        target = boundaries[index];
      }
    }
    this.#mTarget = target;
  }

  //Static functions to return commnly used color scales
  //   static NDC3ColorScale(boundaries, target, blended) {
  //     const colorScale3Colors = ["red", "lime", "yellow"];
  //     if (boundaries === undefined) boundaries = [10, 20];
  //     if (target === undefined) target = 15;
  //     return new GY_ColorScale(
  //       colorScale3Colors,
  //       boundaries,
  //       target,
  //       Boolean(blended)
  //     );
  //   }
  //   static NDC7ColorScale(boundaries, target, blended) {
  //     const colorScale7Colors = [
  //       "darkblue",
  //       "blue",
  //       "cyan",
  //       "lime",
  //       "yellow",
  //       "orange",
  //       "red",
  //     ];

  //     if (boundaries === undefined) boundaries = [10, 12, 14, 16, 18, 20];
  //     if (target === undefined) target = 15;
  //     return new GY_ColorScale(
  //       colorScale7Colors,
  //       boundaries,
  //       target,
  //       Boolean(blended)
  //     );
  //   }

  //Set the colors
  //If this is passed an undefined array then the default colors will be used
  SetColors(colors) {
    //Use default colors?
    if (colors === undefined) colors = this.#mColorsDefault;

    //Validate the array
    if (colors.length !== this.#mColorsDefault.length)
      console.error(
        "Invalid colors array - must be same size as original (" +
          this.#mColorsDefault.length +
          ")"
      );

    //Check for changes
    var changed = false;
    if (this.#mColorsActive === undefined) changed = true;
    else {
      for (var i = 0; i < colors.length; i++) {
        if (colors[i] !== this.#mColorsActive[i]) changed = true;
      }
    }
    if (!changed) return false;

    //Copy
    this.#mColorsActive = [];
    this.#mColorsActive.push(...colors);

    //Rebuild the arrays
    this.#buildArrays();
    return changed;
  }

  //Set boundary values return true if values changed
  SetBoundaries(boundaries) {
    //Get number of colors
    var numberOfColors = this.#mColorsActive.length;

    //Validate boundaries
    if (boundaries === undefined) {
      console.error("GY_ColorScale must be passed array of boundaries");
    }
    if (boundaries.length !== numberOfColors - 1) {
      console.error(
        "GY_ColorScale must be passed array of boundaries with one fewer entry than colors array"
      );
    }

    //Create a sorted list
    var boundsSorted = [];
    boundsSorted.push(...boundaries);
    boundsSorted.sort(function (a, b) {
      return a - b;
    });
    var min = boundsSorted[0];
    var max = boundsSorted[numberOfColors - 2];
    var range = max - min;
    if (range <= 0)
      console.error(
        "GY_ColorScale must be passed array of boundaries containing numbers with a range greater than 0"
      );

    //Check for changes
    var changed = false;
    if (this.#mBoundaries === undefined) changed = true;
    else {
      for (var i = 0; i < boundsSorted.length; i++) {
        if (boundsSorted[i] !== this.#mBoundaries[i]) changed = true;
      }
    }

    //Exit if no changes
    if (!changed) return false;

    //Save boundaries
    this.#mBoundaries = boundsSorted;

    //Rebuild the arrays
    this.#buildArrays();
    return true;
  }

  //Set blended - Return true if changed
  SetBlended(blended) {
    blended = Boolean(blended);
    if (this.#mBlendedScale === blended) return false;
    this.#mBlendedScale = blended;

    //Rebuild the arrays
    this.#buildArrays();
    return true;
  }

  //Get blended state
  GetBlended() {
    return this.#mBlendedScale;
  }

  //Build the arrays
  #buildArrays() {
    //Get boundary information
    var numberOfColors = this.#mColorsActive.length;
    var boundaries = this.#mBoundaries;
    if (boundaries === undefined) return;
    var min = boundaries[0];
    var max = boundaries[numberOfColors - 2];
    var range = max - min;

    //Calculate a bounds array based on scaleBoundary
    //Add 10% either side to show the outer scales
    var delta = range / 10;
    min -= delta;
    max += delta;
    range = max - min;

    //Create a bounds array which is scaled 0 to 1
    var bounds = [0];
    var scaledBounds = [min];
    boundaries.forEach(function (value, index) {
      bounds.push((value - min) / range);
      scaledBounds.push(value);
    });
    bounds.push(1);
    scaledBounds.push(max);

    //Create a scaled bounds array including the min and max
    //Get the scale
    var colors = this.#mColorsActive;
    var scale = [];
    if (this.#mBlendedScale) {
      //Create a blended scale
      //Add scaled target value to bounds and re-sort
      var target = this.#mTarget;
      if (target === undefined || target < min || target > max)
        target = (min + max) / 2;
      bounds.push((target - min) / range);
      bounds.sort(function (a, b) {
        return a - b;
      });

      //Create the scale
      bounds.forEach(function (value, index) {
        var colorIndex = index - 1;
        if (colorIndex < 0) colorIndex = 0;
        else if (colorIndex >= numberOfColors) colorIndex = numberOfColors - 1;
        scale.push([value, colors[colorIndex]]);
      });
    } else {
      //Create a discrete color scale
      for (var i = 0; i < numberOfColors; i++) {
        scale.push([bounds[i], colors[i]]);
        scale.push([bounds[i + 1], colors[i]]);
      }
    }

    //Set the color scale info
    this.#mColorScale = {
      scale: scale,
      zmin: min,
      zmax: max,
      bounds: scaledBounds,
    };
  }

  //Set the target value
  //Return true if changed
  SetTarget(target) {
    if (target === undefined) return false;
    if (this.#mTarget === target) return false;
    this.#mTarget = target;
    return true;
  }

  //Get boundaries
  GetBoundaries() {
    var ret = [];
    if (this.#mBoundaries !== undefined) ret.push(...this.#mBoundaries);
    return ret;
  }

  //Get target value
  GetTarget() {
    return this.#mTarget;
  }

  //Function to return true if was passed valid data
  isValid() {
    return this.#mColorsActive !== undefined;
  }

  //Get a color band info
  GetBandInfo(index) {
    //Reject invalid index
    if (index < 0 || index >= this.#mColorsActive.length) return undefined;

    //Return info
    return {
      color: this.#mColorsActive[index],
      from: this.#mColorScale.bounds[index],
      to: this.#mColorScale.bounds[index + 1],
    };
  }

  //Get a limit line info given an index
  //This function returns one limit line for each of the boundary values and colors it using the outermost color
  //I.e. if we have 6 bounds the colors used will be color[0], color[1], color[2], color[4], color[5], color[6] (all bounds have a color)
  //     if we have 5 bounds the colors used will be color[0], color[1], color[4], color[5]                     (the middle value is not treated as a limit line)
  GetLimitLineInfo(index) {
    //Calculate number of bounds
    var numBounds = this.#mBoundaries.length;
    var oddBoundCount = numBounds % 2 !== 0;
    if (oddBoundCount) numBounds--;

    //Reject invalid index
    if (index < 0 || index >= numBounds) return undefined;

    //Get color and limit indexes
    var colorIndex = index;
    var limitIndex = index;
    if (index >= numBounds / 2) {
      colorIndex++;
      if (oddBoundCount) {
        colorIndex++;
        limitIndex++;
      }
    }

    //Return info
    return {
      color: this.#mColorsActive[colorIndex],
      limit: this.#mBoundaries[limitIndex],
    };
  }

  //Apply a color scale to the given series e.g. a heatmap or 3D plot
  ApplyScaleToSeries(series) {
    //Validate
    if (series === undefined) return false;

    //Add simple data settings
    series.autocolorscale = false;
    if (series.type === "surface") {
      series.cmin = this.#mColorScale.zmin;
      series.cmax = this.#mColorScale.zmax;
    } else {
      series.zmin = this.#mColorScale.zmin;
      series.zmax = this.#mColorScale.zmax;
    }
    series.autocontour = false;

    //Adjust or add the color scale
    if (series.colorscale === undefined) {
      //Color scale is so far undefined so create empty array
      series.colorscale = [];
    } else {
      //Color scale is defined so clear it so we can adjust existing array
      //This ensures Plotly can redraw and existing scale more efficiently
      series.colorscale.length = 0;
    }
    this.#mColorScale.scale.forEach(function (value, index) {
      series.colorscale.push(value);
    });

    //Done
    return true;
  }

  //Get color index given a Y value
  GetColorIndex(y) {
    try {
      var boundCount = this.#mColorsActive.length - 1;
      for (var i = 0; i < boundCount; i++) {
        if (y < this.#mBoundaries[i]) return i;
      }
      return boundCount;
    } catch (err) {
      return 0;
    }
  }

  //Build an array of traces (or adjust an existing array)
  //Each array will represent each of the color bands
  //The function is passed and object as follows
  //{
  //  xData     : Array of X values (optional - if ommitted an array of 0 to n-1 will be created where n is the number of items in the yData array)
  //  yData     : Array of Y values (also used to map against the colors and limits) - NOTE xData and yData must have same size
  //  fillmode  : One of the following options 'totarget' (default), 'toaverage', 'tozero', 'none'
  //  transpose : Optional (default false). If set move do comparison on Y but make the graph a vertical graph by transposing axes and filling in X direction
  //}
  BuildMultiColorTraces(data, existingTraces) {
    //Get settings from Data
    var XData = data.xData;
    var YData = data.yData;
    var fillMode = data.fillmode;
    var transpose = false;
    if (data.transpose !== undefined) transpose = !!data.transpose;
    var traceName = data.traceName;

    //Calculate the best range for the axis given the YData and target value
    //TODO Calculate min and max over visible X range(s) if provided (DevOps: 14696)
    var target = this.#mTarget;
    var min = target;
    var max = target;
    if (YData !== undefined && YData.length > 0) {
      min = Math.min(...YData);
      max = Math.max(...YData);
    } else XData = [];
    if (min > target) min = target;
    if (max < target) max = target;
    var delta = (max - min) / 10;
    if (min < delta && min >= 0) min = 0;
    else min -= delta;
    max += delta;
    data.range = {
      min: min,
      max: max,
    };

    //Build X data and validate if Y data provided
    if (YData !== undefined) {
      //Create XData?
      if (XData === undefined || XData.length === 0) {
        XData = [];
        for (var i = 0; i < YData.length; i++) XData.push(i);
      }

      //Validate arrays
      try {
        if (XData.length !== YData.length) {
          console.warn(
            "BuildMultiColorTraces must be passed X and Y arrays of same length"
          );
          return existingTraces;
        }
      } catch (err) {
        console.warn("Error in BuildMultiColorTraces");
        return existingTraces;
      }
    }

    //Get the fillTo value
    var fillTo = target;
    var fillModeY = "tonexty";
    var fillModeX = "tonexty";
    var lineMode = "none";
    var doFill = true;
    if (YData === undefined) {
      fillModeY = "none";
      fillModeX = "none";
      fillTo = 0;
      doFill = false;
    } else if (fillMode === "none") {
      fillModeY = "none";
      fillModeX = "none";
      lineMode = "lines";
      fillTo = 0;
      doFill = false;
    } else if (fillMode === "tozero") fillTo = 0;
    else if (fillMode === "toaverage") {
      var sum = 0;
      YData.forEach(function (value) {
        sum += value;
      });
      if (YData.length > 0) fillTo = sum / YData.length;
    }

    //Working arrays of traces
    var tracesOffset = [];
    var tracesData = [];

    //Handle existing traces
    var ret = existingTraces;
    if (existingTraces !== undefined) {
      //Check existing traces are compatible with this map
      if (existingTraces.length !== this.#mColorsActive.length * 2) {
        console.warn(
          "Error in BuildMultiColorTraces: existing traces not compatible with this object"
        );
        return existingTraces;
      }

      //Fill tracesOffset and traceData with data from existingTraces and clear the arrays
      existingTraces.forEach(function (value, index) {
        if (index % 2 === 0) tracesOffset.push(value);
        else tracesData.push(value);
        value.x.length = 0;
        value.y.length = 0;
      });
    } else {
      //Create clean list of traces to return
      ret = [];

      //Define a default trace name
      if (traceName === undefined) traceName = "Trace X";

      //Build new array of traces for each color
      for (let i = 0; i < this.#mColorsActive.length; i++) {
        //Get line color
        var lineColor = this.#mColorsActive[i];

        //Offset trace
        var trace1 = {
          x: [],
          y: [],
          fill: "tozeroy",
          fillcolor: "rgba(1,1,1,0)",
          mode: "none",
          hoverinfo: "none",
        };
        tracesOffset.push(trace1);
        ret.push(trace1);

        //Data trace
        var trace2 = {
          x: [],
          y: [],
          fill: "tonexty",
          fillcolor: lineColor,
          mode: "none",
          line: { color: lineColor },
        };
        tracesData.push(trace2);
        ret.push(trace2);
      }
    }

    //Update trace names, line mode, fill mode, orientation and color
    var orientation = "h";
    var fillmode = fillModeY;
    if (transpose) {
      orientation = "v";
      fillmode = fillModeX;
    }
    var colors = this.#mColorsActive;
    tracesData.forEach(function (value, index) {
      if (traceName !== undefined) value.name = traceName;
      value.mode = lineMode;
      value.fill = fillmode;
      value.orientation = orientation;
      var lineColor = colors[index];
      value.fillcolor = lineColor;
      value.line.color = lineColor;
    });
    fillmode = "tozeroy";
    if (transpose) fillmode = "tozerox";
    tracesOffset.forEach(function (value, index) {
      value.fill = fillmode;
      value.orientation = orientation;
    });

    //Working traces
    var traceOffset = undefined;
    var traceData = undefined;
    var traceOffsetXData = undefined;
    var traceOffsetYData = undefined;
    var traceDataXData = undefined;
    var traceDataYData = undefined;
    var activeIndex = -1;
    var lastX;
    var lastY;

    //Add points to the traces
    for (let i = 0; i < XData.length; i++) {
      //Get x any y values and determine the index to use
      var x = XData[i];
      var y = YData[i];
      var index = this.GetColorIndex(y);

      //New index
      if (index !== activeIndex) {
        //Save active index
        activeIndex = index;

        //Add point to last layers (if defined) so we don't get any visible gaps
        if (traceData !== undefined) {
          //Add (x, fillTo) to offset layer
          traceOffsetXData.push(x);
          traceOffsetYData.push(fillTo);

          //Add (x, y) to main layer
          traceDataXData.push(x);
          traceDataYData.push(y);

          //Also add a point at (x, fillTo) if filling
          if (doFill) {
            //This will be used to hide the data between empty sections
            traceDataXData.push(x);
            traceDataYData.push(fillTo);

            //Add a corresponding point for the offset layer
            traceOffsetXData.push(x);
            traceOffsetYData.push(fillTo);
          }
        }

        //Update active layers
        traceOffset = tracesOffset[index];
        traceData = tracesData[index];
        if (transpose) {
          traceOffsetXData = traceOffset.y;
          traceOffsetYData = traceOffset.x;
          traceDataXData = traceData.y;
          traceDataYData = traceData.x;
        } else {
          traceOffsetXData = traceOffset.x;
          traceOffsetYData = traceOffset.y;
          traceDataXData = traceData.x;
          traceDataYData = traceData.y;
        }

        //If adding to layers with data then add null to break data and a dummy start point
        if (traceOffset.x.length > 0) {
          //Push on a null point followed by(x, fillTo) point to break the line in the gap and hide the fill section
          traceDataXData.push(null);
          traceDataYData.push(null);
          if (doFill) {
            traceDataXData.push(x);
            traceDataYData.push(fillTo);
          }

          //Push on a null point followed by(x, fillTo) onto the offset layer to match with the above point
          traceOffsetXData.push(null);
          traceOffsetYData.push(null);
          if (doFill) {
            traceOffsetXData.push(x);
            traceOffsetYData.push(fillTo);
          }
        }
      }

      //Add offset trace
      traceOffsetXData.push(x);
      traceOffsetYData.push(fillTo);

      //Add data trace
      traceDataXData.push(x);
      traceDataYData.push(y);

      //Save last x and y
      lastX = x;
      lastY = y;
    }

    //Return list
    return ret;
  }
}

export { ColorScale };
