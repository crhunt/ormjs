// Initialize all the utilities required by the web-app.

var ormjs;

function webapp_utilities() {
    highlight_listener();
    activate_vdragbar("vdragbar","container","left_box");
}

function set_traversal(view) {

    console.log("set_traversal", view, view.id)

    view.traversal_target = "rel";
    if(d3.select("#traversalMode").property("checked")){
        view.traversal = true;
    } else {
        view.traversal = false;
    }
    ormjs.Traversal.update(view);
}

function set_highlighter(modelID) {
    if(d3.select("#highlightNoParse").property("checked")){
        ormjs.display.highlightNoParse = true;
    } else {
        ormjs.display.highlightNoParse = false;
    }
    ormjs.RelHighlighter.highlight(modelID);
}

function set_xml_parser(metamodel) {
    if(d3.select("#parse_xml").property("checked")){
        ormjs.display.parse_xml = true;
    } else {
        ormjs.display.parse_xml = false;
    }
    ormjs.GenerateRel.display_rel( metamodel );
    display_xml(metamodel);
}
