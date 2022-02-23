/*
    Constructing the svg
*/

/*----- Global definitions -----*/

var orm; // Defined in parse-svg
var svg; // Defined here in svg-constructor
var svgscale; // Defined here in svg-constructor

function prototypes() {

    // Not used

    // Create the svg and populate with prototype object for
    // entities.

    //var defs = svg.append("defs");
    /*var lingrad = defs.append("linearGradient")
        .attr("id","mandatoryConstraint")
        .attr("x1","0%")
        .attr("x2","100%")
        .attr("y1","0%")
        .attr("y2","0%")
        .attr("gradientUnits","userSpaceOnUse");
    lingrad.append("stop")
        .attr("offset","0%")
        .attr("class", "constraintColor");
    lingrad.append("stop")
        .attr("offset","20px")
        .attr("class", "constraintColor");
    lingrad.append("stop")
        .attr("offset","21px")
        .attr("class", "connColor");
    lingrad.append("stop")
        .attr("offset","100%")
        .attr("class", "connColor");*/// Defined in graph-constructor
    

    //entity_prototype(defs);
    //connectors_prototype(defs);
    //rolebox_prototype(defs);
    return
}

function svg_actions(mysvg) {

    /*
        Click events on the SVG.
     */

    mysvg
        .on("contextmenu", d3.contextMenu(svgOptions))
        .on("mousedown", svg_mousedown)
        .on("click", (event) => { 
            d3.select("#hrect").remove();
            //unselect_all();
         })
        .on("dblclick", (event) => {
            event.stopPropagation();
            // Just in case
            d3.select("#hrect").remove();
            unselect_all();
            // Get mouse position
            var mouse = d3.pointer(event);
            if (event.shiftKey && event.ctrlKey) {
                // Create value on ctrl+shift+doubleclick
                draw_value(mouse[0],mouse[1]);
            } else if (event.shiftKey) {
                // Create rolebox on shift+doubleclick
                draw_fact(mouse[0],mouse[1]);
            } else {
                // Create entity on doubleclick
                draw_entity(mouse[0],mouse[1]);
            }
        });
}

function set_viewbox(svgscale) {
    /* Rescale SVG using viewBox attribute.
       Set the string for the rescale. */
    return "-" + svgscale/2 + ", -" + svgscale/2 +
           ", " + svgscale + ", " + svgscale;
}

function set_svgscale() {
    /* Set the viewBox attribute based on value of #svgscale attribute. */
    // Pull the intial scale and the range from the css variables
    var svgscale = parse_number( d3.select("#svgscale").property("value") );
    var svgscalemin = parse_number( d3.select("#svgscale").property("min") );
    var svgscalemax = parse_number( d3.select("#svgscale").property("max") );
    // Invert the scale so slider is more intuitive (slide right to zoom in)
    var inv_scale = svgscalemax + svgscalemin - svgscale;
    // Set viewBox
    svg
        .attr("viewBox", () => set_viewbox(inv_scale))
        .attr("scaleValue", inv_scale);
}

window.onload = function() {

    initialize_globals();

    // Scale the svg based on parameters et in orm-style.css
    var svgscale = parse_number( get_css_variable('--svg-scale') );
    var svgscalemin = parse_number( get_css_variable('--svg-scale-min') );
    var svgscalemax = parse_number( get_css_variable('--svg-scale-max') );
    var inv_scale = svgscalemax + svgscalemin - svgscale;

    //Create SVG element
    svg = d3.select("#canvas")
                .append("svg")
                .attr("id","canvas-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                //.attr("preserveAspectRatio","none")
                .attr("viewBox", () => set_viewbox(svgscale))
                .attr("scaleValue", inv_scale)
                .attr("shape-rendering", "geometricPrecision");

    // Define prototype objects
    //prototypes();

    // Popup actions
    d3.select("body")
        .on("keypress", (event) => {
            if(event.keyCode === 13 && open_popups.length > 0) {
                enter_last_popup();
            }
        })

    // Button actions
    // Download diagram as image
    d3.select("#downloadPngButton")
      .on("click", download_png);
    // Download diagram
    d3.select("#downloadSvgButton")
      .on("click", download_svg);
    // Upload diagram
    d3.select("#uploadSvgButton")
      .on("change", upload_svg, false);
    // Parse the diagram
    /*d3.select("#rel")
      .on("click", parse_orm);*/
    // Highlight ORM elements not parsed to Rel
    d3.select("#highlightNoParse")
      .property("checked",false)
      .on("change",set_highlighter);
    // Set Rel display format
    d3.select("#graphFormat")
      .property("checked",false)
      .on("change",set_graphformat);
    d3.select("#shortFormat")
      .property("checked",true)
      .on("change",set_shortformat);
    // Highlight ORM elements not parsed to Rel
    d3.select("#parse_xml")
      .property("checked",false)
      .on("change",set_xml_parser);
    // Set slider for svg size
    d3.select("#svgscale")
      .property("min", svgscalemin)
      .property("max", svgscalemax)
      .property("value", svgscale)
      .on("change", set_svgscale);

    
    // Actions related to interaction with the svg
    svg_actions(svg);

    // Draw an initial entity
    draw_entity(0,0);

}