/* 
    Convert d3 data to ORM metamodel.
 */

var orm;
var conntypes;
var metamodel;

function parse_orm() {

    metamodel = { Objects: {}, Facts: {} };

    // Get all objects
    metamodel_add_objects();

    // Get all facts

    console.log(metamodel);
    // Convert to Rel
}

/* Add objects to metamodel */

function metamodel_add_objects() {
    
    // Add entities
    metamodel_add_entities();
}

function metamodel_add_entities() {

    for (var entityID in orm.entities ) {
        d = orm.entities[entityID].datum();
        var obj = { 
            id: entityID, 
            Name: d.name,
            _ReferenceMode: d.refmode,
            PlayedRoles: entity_plays_roles(orm.entities[entityID]),
            PreferredIdentifier: ""
        }
        metamodel.Objects[entityID] = obj;
    }
}