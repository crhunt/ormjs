/* 
    Convert d3 data to ORM metamodel.

    Note the design here is to make a full pass over the model whenever 
    parse_orm() is triggered. So no incremental updates. However, the
    individual update functions are designed to make it easier to add
    functions for incremental updates in the future.

    We may want to move to a system where each d3 object is linked to
    its representation in the metamodel. And that component of the metamodel 
    is updated when the d3 object is changed. 
        This will be especially useful for large models. Since ORMJS is 
        currently aimed at prototyping and as a teaching tool, we defer 
        this for now.

 */

// Note: This requires encapsulation in a subsequent PR


/* Globals */
var ormjs;
//var metamodel; // Defined here

var graphFormat = false; // Defined here
var shortFormat = true; // Defined here

/* Main functions */

function parse_orm() {

    var modelID = 'id-model-0';

    ormjs.models[modelID].populate_metamodel();

    var metamodel = ormjs.models[modelID].metamodel;

    // Convert to Rel
    ormjs.GenerateRel.parse( metamodel );

    // Display Rel code
    ormjs.GenerateRel.display_rel( metamodel );
    
    // Display XML code
    display_xml(metamodel);

    // Display shadows in ORM diagram
    ormjs.Graph.add_shadows(metamodel);

}

/* Settings that determine how to determine if facts are shadowed */

/* Set whether to use Graph Rel format. This determines:
   1. whether to use modules for the fact relation name
   2. the behavior of Short Rel format (see below) */

function set_graphformat() {
    d3.select("#graphFormat").property("checked") ? graphFormat = true : graphFormat = false;
    parse_orm();
}

/* Set whether to use Short Rel format. This determines:
   1. whether to include relations as a part of the fact name 
      (if true, no relations in graph mode)
   2. whether to use entities for the fact name 
      (if true, no entities in non-graph mode) */

function set_shortformat() {
    d3.select("#shortFormat").property("checked") ? shortFormat = true : shortFormat = false;
    parse_orm();
}
