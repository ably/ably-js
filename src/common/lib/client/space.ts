

class Spaces {
  get(name: string, options: SpaceOptions): Space {
    return new Space(name, options);
  }
}


class Space {

  name: string;
  private options: SpaceOptions;

  constructor(name: string, options: SpaceOptions){
    this.name = name;
    this.options = options;
  }

}

type SpaceOptions = {
  data?: any;
}


export default Spaces;
