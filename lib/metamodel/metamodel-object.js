/* 
    Objects in the metamodel.
 */

/* Entity */

class EntityType {
    id;
    type = "EntityType";
    Name;
    ReferenceMode;
    PlayedRoles = [];
    PreferredIdentifier = "";
    _Shadows;
    _RelName = null;
    _Atom = "";
    XML = "";

    constructor(n,entity) {
        var d = entity.datum();
        this.id = `metamodel-object-${n.toString()}`;
        this.Name = d.name;
        this.ReferenceMode = d.refmode;
        this.PlayedRoles = object_plays_roles(entity);
        this._Shadows = [ entity.attr("id") ];
    }

    extend(entity) {
        // Extend the EntityType instance with attributes from shadow, entity
        // Add shadow
        this._Shadows.push( entity.attr("id") );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, object_plays_roles( entity ) );
    }

    toXML() {
        var t = "    ";
        this.XML = `<orm:EntityType id="${this.id}" Name="${this.Name}" _ReferenceMode="${this.ReferenceMode}">\n`;
        this.XML +=`${t}<orm:PlayedRoles>\n`;
        this.PlayedRoles.map( (e) => { this.XML += `${t}${t}<orm:Role ref="${e}" />\n`; } )
        this.XML += `${t}</orm:PlayedRoles>\n`;
        this.XML +=`${t}<orm:PreferredIdentifier ref="${this.PreferredIdentifier}" />\n`;
        this.XML += `</orm:EntityType>`;
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */
    
    set_relname() { 
        this._RelName = entity_relname(this.Name); 
        this._Atom = entity_atom_relname(this._RelName, this.ReferenceMode);
    }
}

/* Value */

class ValueType {
    id;
    type = "ValueType";
    Name;
    PlayedRoles = [];
    ConceptualDataType = "";
    _Shadows;
    _RelName = null;
    _Atom = "";
    XML = "";

    constructor(n,value) {
        var d = value.datum();
        this.id = `metamodel-object-${n.toString()}`;
        this.Name = d.name;
        this.PlayedRoles = object_plays_roles(value);
        this._Shadows = [ value.attr("id") ];
    }

    extend(value) {
        // Extend the ValueType instance with attributes from shadow, value
        // Add shadow
        this._Shadows.push( value.attr("id") );
        // Extend roles
        this.PlayedRoles.push.apply( this.PlayedRoles, object_plays_roles( value ) );
    }

    toXML() {
        var t = "    ";
        this.XML = `<orm:ValueType id="${this.id}" Name="${this.Name}">\n`;
        this.XML +=`${t}<orm:PlayedRoles>\n`;
        this.PlayedRoles.map( (e) => { this.XML += `${t}${t}<orm:Role ref="${e}" />\n`; } )
        this.XML += `${t}</orm:PlayedRoles>\n`;
        this.XML +=`${t}<orm:ConceptualDataType id="${this.id}-cdt" ref="${this.ConceptualDataType}" />\n`;
        this.XML += `</orm:ValueType>`;
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */
    
    set_relname() { 
        this._RelName = entity_relname(this.Name); 
        this._Atom = value_atom_relname(this.Name);
    }
}