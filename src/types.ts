import geofenceJson from "../resources/geofences.json" with { type: "json" };

/** Custom CLI args passed to rollup */
export type RollupArgs = Partial<{
  "config-mode": "development" | "production";
  "config-branch": "main";
  "config-host": "dev" | "github" | "varden";
  "config-assetSource": "local" | "github" | "varden";
  "config-suffix": string;
}>;

export type Zone = keyof typeof geofenceJson;
export type GeofenceMap = Record<Zone, number[][]>;

export interface DiscordUserLink {
  id: string,
  avatar: string,
  name: string,
}

//#region API types

export interface PostBody {
  "/api/v1/vault/review": AnySubmittedReview,
  "/api/v1/vault/review/skip": SkipReview,
  "/api/v1/vault/manage/hold": SetHold,
  "/api/v1/vault/manage/releasehold": ReleaseHold,
  "/api/v1/vault/manage/edit": ModifyContribution,
  "/api/v1/vault/manage/appeal": SubmitAppeal,
  "/api/v1/vault/manage/detail": LoadDetails,
  "/api/v1/vault/settings": SaveSettings,
}

export interface QueryParams {
  "/api/v1/vault/messages": MessagesQuery,
  "/api/v1/vault/mapview/gcs": GcsQuery,
  "/api/v1/vault/mapview/lowzoom/gcs": GcsQuery,
}

export interface Responses {
  "GET": {
    "/api/v1/vault/manage": SubmissionsResult,
    "/api/v1/vault/review": AnyReview,
    "/api/v1/vault/home": Showcase,
    "/api/v1/vault/messages": Record<string, string>,
    "/api/v1/vault/settings": UserSettings,
    "/api/v1/vault/profile": Profile,
    "/api/v1/vault/properties": UserProperties,
    "/api/v1/vault/mapview/gcs": Gcs<GcsDetailedData>,
    "/api/v1/vault/mapview/lowzoom/gcs": Gcs<GcsSampleData | GcsNormalData>,
  },
  "POST": {
    "/api/v1/vault/review": string,
    "/api/v1/vault/review/skip": boolean,
    "/api/v1/vault/manage/hold": string,
    "/api/v1/vault/manage/releasehold": string,
    "/api/v1/vault/manage/edit": string,
    "/api/v1/vault/manage/appeal": string,
    "/api/v1/vault/manage/detail": AnyContribution,
    "/api/v1/vault/settings": string,
  },
}

//#region Wayfarer types

export interface ApiResult<T> {
  result: T,
  message: string | null,
  code: string,
  fieldErrors: null, // TODO
  errorDetails: null // TODO
  version: string,
  captcha: boolean,
}

type DarkMode = "ENABLED" | "DISABLED" | "AUTOMATIC";
type GmoStatus = "ACTIVE" | "INACTIVE";

interface GcsQuery {
  ne: string,
  sw: string,
  cellLevel: number,
}

interface MessagesQuery {
  language: string,
}

interface PogoGmo {
  gameBrand: "HOLOHOLO",
  entity: "GYM" | "POKESTOP" | "POWERSPOT",
  status: GmoStatus,
}

interface GcsNormalDataMeta {
  s2CellLevel: number,
  s2CellId: string,
  generatedTimestamp: string,
  count: number,
}

interface GcsSampleDataMeta extends GcsNormalDataMeta {
  format: "SAMPLE",
}

interface GcsDetailedDataMeta extends GcsNormalDataMeta {
  format: "DETAILED",
}

interface GcsSampleDataPoi {
  poiId: string,
  latE6: number,
  lngE6: number,
  isCommunityContributed: boolean,
}

interface GcsNormalDataPoi extends GcsSampleDataMeta {
  title: string,
  description: string,
  mainImage: string,
}

interface GcsDetailedDataPoi extends GcsNormalDataPoi {
  address: string,
  categoryTags: never[], // TODO
  hasAdditionalImages: boolean,
  gmo: PogoGmo[],
}

interface GcsSampleData {
  metadata: GcsSampleDataMeta,
  pois: GcsSampleDataPoi[],
  cellId: string,
}

interface GcsNormalData {
  metadata: GcsNormalDataMeta,
  pois: GcsNormalDataPoi[],
  cellId: string,
}

interface GcsDetailedData {
  metadata: GcsDetailedDataMeta,
  pois: GcsDetailedDataPoi[],
  clusters: never[], // TODO
  cellId: string,
}

export interface Gcs<T> {
  success: true,
  data: T[],
  cellsQueried: number,
  cellsLoaded: number,
  snapshot: string,
  cellLevel: number,
}

export interface SaveSettings {
  darkMode?: DarkMode,
  autoScroll?: false,
  // TODO: Add more
}

export interface SubmissionsResult {
  submissions: AnyContribution[],
  canAppeal: boolean,
  immediateUpgradeEnabled: boolean,
}

export interface ShowcasedWayspot {
  guid: string,
  title: string,
  description: string,
  lat: number,
  lng: number,
  address: string,
  countryLong: string,
  countryShort: string,
  stateLong: string,
  stateShort: string,
  city: string,
  postalCode: null, // TODO
  imageUrl: string,
  index: number,
  discoverer: string,
  discovererGame: string,
  categoryName: string,
  criteriaTitle: string,
  criteriaDescription: string,
}

export interface Showcase {
  showcase: ShowcasedWayspot[],
  notifications: never[], // TODO
  punishmentWarn: boolean,
  showcaseMessage: string,
}

interface SocialProfile {
  email: string,
  name: string,
  pictureUrl: string,
  username: string,
}

interface MapViewConfig {
  poiMinZoom: number,
  poiMaxZoom: number,
  defaultCellLevel: number,
  showDetailedViewOnly: boolean,
  lowZoomDetailedCellLevel: number,
  mapMinZoom: number,
  mapMaxZoom: number,
}

export interface UserProperties {
  authenticated: boolean,
  language: string,
  hasEnvironmentAccessToSubmitWayspot: boolean,
  hasEnvironmentAccessToAtlas: boolean,
  browserKey: string,
  socialProfile: SocialProfile,
  amsAdminPerms: [],
  autoScroll: boolean,
  recaptchaKey: string,
  hasEnvironmentAccessToSubmitWayspotDraft: boolean,
  canReview: boolean,
  mapViewConfig: MapViewConfig,
  attributionDisclaimerAccepted: boolean,
  oAuth2LoginEnabled: boolean,
  version: string,
  nianticLoginEnabled: boolean,
  canResetCredibility: boolean,
  titanReverseGeocodeEnabled: boolean,
  performance: string,
  rewardProgress: number,
  rewardAvailable: number,
  nianticLoginStartUri: string,
  attribution: boolean,
  nianticIdUrl: boolean,
  darkMode: DarkMode,
  eligibleToOnboard: boolean,
  onboardingState: string,
}

export interface UserSettings {
  hometownLatLng: string,
  bonusLatLng: string,
  bonusCanChange: boolean,
  nextBonusChangeTimeMs: number,
  hometownCanChange: boolean,
  language: string,
  autoScroll: boolean,
  darkMode: DarkMode,
  attribution: boolean,
  campaign: boolean,
  autoUpgrade: boolean,
}

export interface Profile {
  socialProfile: SocialProfile,
  performance: string,
  finished: number,
  accepted: number,
  rejected: number,
  duplicated: number,
  available: number,
  progress: number,
  total: number,
  interval: number,
  maximum: number,
  history: never[], // TODO: what is this?
}

export enum ContributionType {
  NOMINATION = "NOMINATION",
  EDIT_LOCATION = "EDIT_LOCATION",
  EDIT_DESCRIPTION = "EDIT_DESCRIPTION",
  EDIT_TITLE = "EDIT_TITLE",
  PHOTO = "PHOTO",
}

export type EditContributionType =
  ContributionType.EDIT_TITLE |
  ContributionType.EDIT_DESCRIPTION |
  ContributionType.EDIT_LOCATION |
  ContributionType.PHOTO;

export enum ContributionStatus {
  ACCEPTED = "ACCEPTED",
  APPEALED = "APPEALED",
  DUPLICATE = "DUPLICATE",
  HELD = "HELD",
  NIANTIC_REVIEW = "NIANTIC_REVIEW",
  NOMINATED = "NOMINATED",
  REJECTED = "REJECTED",
  VOTING = "VOTING",
  WITHDRAWN = "WITHDRAWN",
}

export enum OriginalPoiState {
  LIVE = "LIVE",
  RETIRED = "RETIRED",
}

export interface RejectReason {
  reason: string,
}

interface Contribution {
  id: string,
  type: ContributionType,
  title: string,
  description: string,
  lat: number,
  lng: number,
  city: string,
  state: string,
  day: string,
  order: number,
  imageUrl: string,
  upgraded: boolean,
  status: ContributionStatus,
  isMutable: boolean,
  isNianticControlled: boolean,
  statement: string,
  supportingImageUrls: string[],
  rejectReasons: RejectReason[],
  canAppeal: boolean,
  canUpgrade: boolean,
  appealResolved: boolean,
  isClosed: boolean,
  appealNotes: string,
  userAppealNotes: string,
  canHold: boolean,
  canReleaseHold: boolean,
}

export interface OriginalPoiData {
  id: string,
  imageUrl: string,
  title: string,
  description: string,
  lat: number,
  lng: number,
  city: string,
  state: OriginalPoiState,
  lastUpdateDate: string,
}

export interface EditContribution<T extends EditContributionType> extends Contribution {
  type: T
  poiData: OriginalPoiData
}

export interface Nomination extends Contribution {
  type: ContributionType.NOMINATION,
  poiData: never[],
}

export type AnyEditContribution =
  EditContribution<ContributionType.EDIT_LOCATION> |
  EditContribution<ContributionType.EDIT_DESCRIPTION> |
  EditContribution<ContributionType.EDIT_TITLE> |
  EditContribution<ContributionType.PHOTO>;

export type AnyContribution =
  AnyEditContribution |
  Nomination;

//#region Incoming reviews

export interface BaseReview {
  id: string,
  lat: number,
  lng: number,
  expires: number,
  canSkip: boolean,
  autoScroll: boolean | null,
  china: boolean | null,
  title: string,
  description: string,
}

export interface NewReview extends BaseReview {
  type: "NEW",
  imageUrl: string,
  nearbyPortals: {
    guid: string,
    title: string,
    description: string,
    imageUrl: string,
    lat: number,
    lng: number,
  }[],
  t1: number,
  newLocationMaxDistance: number,
  statement: string,
  supportingImageUrls: string[],
  streetAddress: string,
  categoryIds: string[],
}

export interface TextEditOption {
  value: string,
  hash: string,
}

export interface EditReview extends BaseReview {
  type: "EDIT",
  imageUrl: string,
  titleEdits: TextEditOption[],
  descriptionEdits: TextEditOption[], // TODO: verify
  locationEdits: {
    value: string,
    hash: string,
    lat: string,
    lng: string,
  }[],
}

export interface PhotoReview extends BaseReview {
  type: "PHOTO",
  newPhotos: {
    value: string,
    hash: string,
  }[],
}

export type AnyReview = NewReview | EditReview | PhotoReview;

//#region Submitted reviews

export interface AcceptedNewReview {
  id: string,
  type: "NEW",
  quality: number,
  description: number,
  cultural: number,
  uniqueness: number,
  safety: number,
  location: number,
  socialize: number,
  photo: number,
  exercise: number,
  accuracyDontKnowComment: string,
  reviewerSuggestedCategories: string[],
}

export interface RejectedNewReview {
  id: string,
  type: "NEW",
  spam: true,
  rejectReasons: string[],
  accuracyRejectComment: string,
}

export interface DuplicatedNewReview {
  id: string,
  type: "NEW",
  duplicate: true,
  duplicateOf: string,
}

export type SubmittedNewReview = AcceptedNewReview | RejectedNewReview | DuplicatedNewReview;

export interface SubmittedEditReview {
  id: string,
  type: "EDIT",
  comment: string,
  descriptionUnable: boolean,
  selectedDescriptionHash?: string,
  locationUnable: boolean,
  selectedLocationHash?: string,
  titleUnable: boolean,
  selectedTitleHash?: string,
}

export interface SubmittedPhotoReview {
  id: string,
  type: "PHOTO",
  abuseReasons: Record<string, string>, // ID -> reason
  acceptPhotos: string[],
  rejectPhotos: string[],
}

export type AnySubmittedReview = SubmittedNewReview | SubmittedEditReview | SubmittedPhotoReview;

//#region Contribution management

export interface SetHold {
  id: string,
}

export interface ReleaseHold {
  id: string,
}

export interface LoadDetails {
  id: string,
}

export interface SkipReview {
  id: string,
}

export interface ModifyContribution {
  id: string,
  title: string,
  description: string,
  supporting: string,
}

export interface SubmitAppeal {
  id: string,
  statement: string,
}
