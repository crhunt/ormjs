/* Initialize ORMJS on page load */

// Note: disentangle what users shouldn't need to initialize

var ormjs;

window.onload = function() {

    //initialize_globals();
    
    // Create metamodel
    initialize_metamodel();
    // Create model
    var model = new ormjs.Model();

    // Initialize web-app utilities
    webapp_utilities();

    // Create SVG
    var svgobj = new ormjs.View({model: model.id});
    svgobj.set_current();

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

    // Draw an initial entity
    //draw_entity(0,0);
    new ormjs.Entity({x: 0, y: 0, model: model.id});

}
