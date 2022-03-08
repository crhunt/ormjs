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