/* Initialize ORMJS on page load */

var svg; // Defined here in svg-constructor

window.onload = function() {

    initialize_globals();

    var svgobj = new View();
    svgobj.set_current();

    /*// Scale the svg based on parameters et in orm-style.css
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

    // Popup actions
    d3.select("body")
        .on("keypress", (event) => {
            if(event.keyCode === 13 && open_popups.length > 0) {
                enter_last_popup();
            }
        })

    */

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

    
    /*// Set slider for svg size
    d3.select("#svgscale")
      .property("min", svgscalemin)
      .property("max", svgscalemax)
      .property("value", svgscale)
      .on("change", set_svgscale);*/

    
    // Actions related to interaction with the svg
    //svg_actions(svg);

    // Draw an initial entity
    draw_entity(0,0);

}