/* Initialize ORMJS on page load */

// Note: disentangle what users shouldn't need to initialize

var ormjs;

window.onload = function() {

    ormjs.initialize();

    // Create model
    var model = new ormjs.Model();

    // Display settings
    ormjs.display.graphFormat = false;
    ormjs.display.shortFormat = true;
    model.generate_xml = false;
    model.generate_rel = true;
    model.rel_target = "rel";
    model.xml_target = "rel";

    // Initialize web-app utilities
    webapp_utilities();

    // Create SVG
    var view = new ormjs.View({model: model.id, parent: "canvas"});
    view.set_current();

    view.traversal = false;
    view.traversal_target = "rel";
    view.highlight = false;

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
      .property("checked", view.highlight)
      .on("change",() => { set_highlighter(view); });
    // Traversal Mode
    d3.select("#traversalMode")
      .property("checked", view.traversal)
      .on("change",() => { set_traversal(view); });
    // Set Rel display format
    d3.select("#graphFormat")
      .property("checked", ormjs.display.graphFormat)
      .on("change",() => { set_graphformat(model); } );
    d3.select("#shortFormat")
      .property("checked", ormjs.display.shortFormat)
      .on("change",() => { set_shortformat(model); } );
    // Highlight ORM elements not parsed to Rel
    d3.select("#parse_xml")
      .property("checked", model.generate_xml)
      .on("change", () => { set_xml_parser(model); });

    // Draw an initial entity
    new ormjs.Entity({x: 0, y: 0, view: view.id, model: model.id});

}
