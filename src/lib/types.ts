export type MissionStatus = "verified" | "review" | "queued" | "processing" | "failed";
export type ThreatLevel = "clear" | "watch" | "priority";

export type Mission = {
  id: string;
  source: string;
  zone: string;
  capturedAt: string;
  className: string;
  confidence: number;
  assetCount: number;
  model: string;
  status: MissionStatus;
  threat: ThreatLevel;
};

export type AnalysisRecord = Mission & {
  imageUrl: string;
  fileName: string;
  mode: "eurosat" | "pipeline";
  yoloRan: boolean;
  militaryScore: number;
  detections: Array<{ label: string; confidence: number; box: string; bbox?: [number, number, number, number] }>;
  predictions: Array<{ name: string; probability: number }>;
  notes?: string;
};

export type Prediction = {
  className: string;
  confidence: number;
  gatePassed: boolean;
  stageTwoRan: boolean;
  baseDetected: boolean;
  militaryScore: number;
  latency: number;
  modelName?: string;
  ensembleModels?: Array<{
    modelId: string;
    modelName: string;
    predictions: Array<{ name: string; probability: number }>;
  }>;
  aggregatePredictions?: Array<{ name: string; probability: number; summedScore?: number }>;
  patches?: Array<{
    label: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  stageTwoError?: string | null;
  predictions: Array<{ name: string; probability: number }>;
  detections: Array<{ label: string; confidence: number; box: string; bbox?: [number, number, number, number] }>;
};

export type EuroSatApiPrediction = {
  dataset: string;
  model_name: string;
  model_id?: string;
  model_file: string;
  input_size: number;
  prediction: number;
  prediction_label: string;
  confidence: number;
  top_predictions: Array<{
    class_index: number;
    class_label: string;
    probability: number;
    summed_score?: number;
  }>;
  patch_analysis?: {
    patch_size: number;
    image_width: number;
    image_height: number;
    total_patches: number;
    aggregation: string;
    patches: Array<{
      class_index: number;
      class_label: string;
      confidence: number;
      bbox_xyxy: number[];
    }>;
  };
  pipeline: {
    stage_1_passed: boolean;
    stage_2_ran: boolean;
    stage_2_error?: string | null;
    military_base_detected: boolean;
    military_base_score: number;
    decision_label: string;
    yolo?: {
      military_detections: Array<{
        class_label: string;
        confidence: number;
        bbox_xyxy: number[];
      }>;
    } | null;
  };
  ensemble?: {
    strategy: string;
    selected_class_label: string;
    selected_class_score: number;
    aggregate_predictions: Array<{
      class_index: number;
      class_label: string;
      probability: number;
      summed_score: number;
    }>;
    model_predictions: Array<{
      model_id: string;
      model_name: string;
      top_predictions: Array<{
        class_index: number;
        class_label: string;
        probability: number;
      }>;
      patch_analysis?: {
        patch_size: number;
        image_width: number;
        image_height: number;
        total_patches: number;
        aggregation: string;
        patches: Array<{
          class_index: number;
          class_label: string;
          confidence: number;
          bbox_xyxy: number[];
        }>;
      };
    }>;
  };
};
