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