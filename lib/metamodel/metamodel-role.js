/* 
    Roles in the metamodel.
 */

var metamodel; // Defined in metamodel-constructor

class Role {
    id;
    Name;
    IsMandatory = false;
    Multiplicity = "None";
    RolePlayer = null;
    _rboxID;
    _rolenum;
    _factID;
    XML = "";

    constructor(n, rbox) {
        
        var d = rbox.datum();
        
        this.id = `role-${n.toString()}`;
        this.Name = d.name;
        this.IsMandatory = d.mandatory;
        this.Multiplicity = d.multiplicity;
        this.RolePlayer = metamodel.ormjs[ d.entity ];
        this._rboxID = rbox.attr("id");
        this._rolenum = n;
    }

    toXML() {
        var t = "    ";
        this.XML = `<orm:Role id="${this.id}" _IsMandatory="${this.IsMandatory}" `;
        this.XML += `_Multiplicity="${this.Multiplicity}" Name="${this.Name}">\n`;
        this.XML += `${t}<orm:RolePlayer ref="${this.RolePlayer}" />\n`;
        this.XML += `</orm:Role>`;
    }

    toFact(fact) {
        this.id = `${fact.id}-${this.id}`;
        this.Multiplicity = fact._multmap[this.Multiplicity];
        this._factID = fact.id;
    }

    /* Functions related to parsing to Rel
       Function definitions in parse-to-rel.js. */
    
    set_relname() { 
        this._RelName = role_relname(this.Name);
    }

}