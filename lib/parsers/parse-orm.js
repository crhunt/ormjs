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

/* Main functions */

function parse_orm() {

    var modelID = 'id-model-0';

    ormjs.models[modelID].update();

}
