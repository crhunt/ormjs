// Initialize all the utilities required by the web-app.

var ormjs;
var viewparents;

function webapp_utilities() {
    highlight_listener();
    activate_vdragbar("vdragbar","container","left_box");
}

/* Model level actions */

function model_settings(model) {
    // Display settings
    ormjs.display.graphFormat = false;
    ormjs.display.shortFormat = true;
    model.generate_xml = false;
    model.generate_rel = true;
    model.rel_target = "rel";
    model.xml_target = "rel";
}

function view_tabs(model) {
    // Button actions
    d3.select("#newView")
      .on("click", () => { create_view(model) });
}

function create_tab() {

    let tabID = `canvas-${viewparents.length}`

    d3.select("#viewdisplay")
      .append("div")
      .attr("class", "canvas")
      .attr("id", tabID);

    let content = `<label class="file-upload"><a id="${tabID}" class="topbutton">View</a></label>`
    d3.select("#viewtabs")
      .append("span")
      .html(content);
}

function create_view(model) {
    // Create SVG
    var view = new ormjs.View({model: model.id, parent: "canvas"});
    model.currentview ? inherit_view_settings(view)
                      : view_settings(view);
    view.set_current();

    button_actions(view);

    // Draw an initial entity
    new ormjs.Entity({x: 0, y: 0, view: view.id});

    model.update();

    return view
}

/* Actions on a view */

function view_settings(view) {
    view.traversal = false;
    view.traversal_target = "rel";
    view.highlight = false;
}

function inherit_view_settings(view) {
    let cview = ormjs.models[view.model].currentview;
    view.traversal = cview.traversal;
    view.traversal_target = cview.traversal_target;
    view.highlight = cview.hightlight;
}

function button_actions(view) {

    let model = ormjs.models[view.model];

    // Download diagram as image
    d3.select("#downloadPngButton")
      .on("click", (event) => { download_png(event, view); });
    // Download diagram
    d3.select("#downloadSvgButton")
      .on("click", () => { download_svg(view); });
    // Upload diagram
    d3.select("#uploadSvgButton")
      .on("change", () => { upload_svg(view); });
    // SVG scale control
    var d = view.d3object.datum();
    d3.select("#svgscale")
        .property("min", d.scale_min)
        .property("max", d.scale_max)
        .property("value", d.scale)
        .on("change", () => { set_svgscale(view); });
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

    model.update();
}

function set_traversal(view) {

    view.traversal_target = "rel";
    if(d3.select("#traversalMode").property("checked")){
        view.traversal = true;
    } else {
        view.traversal = false;
    }
    ormjs.Traversal.update(view);
}

function set_highlighter(view) {
    if(d3.select("#highlightNoParse").property("checked")){
        view.highlight = true;
    } else {
        view.highlight = false;
    }
    ormjs.RelHighlighter.highlight(view);
}

function set_xml_parser(model) {
    if(d3.select("#parse_xml").property("checked")){
        model.generate_xml = true;
    } else {
        model.generate_xml = false;
    }
    model.update();
}

function upload_svg(view) {
    var file = d3.select(`#uploadSvgButton`).node().files[0];

    // Set upload name based on filename
    d3.select("#uploadname").html(file.name);

    // Upload
    ormjs.SVG.upload(file, view.id, () => { 
        console.log(`ormjs: View upload to ${view.id} complete.`) 
        // Update svgscale
        display_svgscale(view);
    });
}

function download_svg(view) {
    var dlbutton = "downloadSvgButton";

    // Set download name
    d3.select(`#${dlbutton}`).attr("download", () => {
        return download_name( d3.select(`#${dlbutton}`).attr("download"), ".svg" );
    });

    ormjs.SVG.download(view.id, dlbutton);
}

function download_png(event, view) {

    var dlbutton = "downloadPngButton";

    // Set download name
    d3.select(`#${dlbutton}`).attr("download", () => {
        return download_name( d3.select(`#${dlbutton}`).attr("download"), ".png" );
    });

    ormjs.PNG.download(event, view.id, dlbutton);
}

function download_name(df,suff) {
    if(!(d3.select("#uploadname").html()  === "")) {
        return d3.select("#uploadname").html().split(".")[0] + suff;
    }
    return df;
}

function set_svgscale(view) {
    view.svgscale_from_element("svgscale");
}

function display_svgscale(view) {
    var d = view.d3object.datum();
    d3.select("#svgscale").node().value = d.scale;
}

/* Settings that determine how to determine if facts are shadowed */

    /* Set whether to use Graph Rel format. This determines:
    1. whether to use modules for the fact relation name
    2. the behavior of Short Rel format (see below) 
*/

function set_graphformat(model) {
    d3.select("#graphFormat").property("checked") ? ormjs.display.graphFormat = true 
                                                  : ormjs.display.graphFormat = false;
    model.update();
}

/* Set whether to use Short Rel format. This determines:
    1. whether to include relations as a part of the fact name 
        (if true, no relations in graph mode)
    2. whether to use entities for the fact name 
        (if true, no entities in non-graph mode) 
*/

function set_shortformat(model) {
    d3.select("#shortFormat").property("checked") ? ormjs.display.shortFormat = true : 
                                                    ormjs.display.shortFormat = false;
    model.update();
}