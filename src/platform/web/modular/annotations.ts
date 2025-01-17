import { AnnotationsPlugin } from 'common/lib/client/modularplugins';
import RealtimeAnnotations from '../../../common/lib/client/realtimeannotations';
import RestAnnotations from '../../../common/lib/client/restannotations';
import Annotation, { WireAnnotation } from '../../../common/lib/types/annotation';

const Annotations: AnnotationsPlugin = {
  Annotation,
  WireAnnotation,
  RealtimeAnnotations,
  RestAnnotations,
};

export { Annotations };
