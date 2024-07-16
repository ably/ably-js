export type TestPrivateApiContextDto = {
  type: 'test';
  title: string;
  /**
   * null means that either the test isn’t parameterised or that this usage is unique to the specific parameter
   */
  parameterisedTestTitle: string | null;
  helperStack: string[];
  file: string;
  suite: string[];
};

export type HookPrivateApiContextDto = {
  type: 'hook';
  title: string;
  helperStack: string[];
  file: string;
  suite: string[];
};

export type RootHookPrivateApiContextDto = {
  type: 'hook';
  title: string;
  helperStack: string[];
  file: null;
  suite: null;
};

export type TestDefinitionPrivateApiContextDto = {
  type: 'definition';
  label: string;
  helperStack: string[];
  file: string;
  suite: string[];
};

export type PrivateApiContextDto =
  | TestPrivateApiContextDto
  | HookPrivateApiContextDto
  | RootHookPrivateApiContextDto
  | TestDefinitionPrivateApiContextDto;

export type PrivateApiUsageDto = {
  context: PrivateApiContextDto;
  privateAPIIdentifier: string;
};

export type TestStartRecord = {
  context: TestPrivateApiContextDto;
  privateAPIIdentifier: null;
};

export type Record = PrivateApiUsageDto | TestStartRecord;
