/**
 * Defines the client-side configuration.
 */
export interface FrontendConfiguration {
    /**
     * If set, all `<script>` elements inserted by the client have `crossorigin` attribute set to this value.
     */
    readonly crossOrigin?: string
}
