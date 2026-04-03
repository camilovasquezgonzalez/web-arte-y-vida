<?php
/**
 * TCultura API Client.
 *
 * Handles fetching, caching, and filtering data from the TCultura B2B API.
 *
 * @package TCultura_Connect
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class TCultura_API_Client {

    /** @var string */
    private $api_key;

    /** @var array */
    private $settings;

    /* ── Constructor ────────────────────────────────────────────────── */

    public function __construct() {
        $this->settings = tcultura_get_settings();
        $this->api_key  = isset( $this->settings['api_key'] ) ? trim( $this->settings['api_key'] ) : '';
    }

    /* ── Public: get full agenda ────────────────────────────────────── */

    /**
     * Returns the combined, sorted, and filtered agenda.
     *
     * @return array  Items on success, or array with 'error' key on failure.
     */
    public function get_agenda() {

        if ( '' === $this->api_key ) {
            return array(
                'error' => __(
                    'API Key no configurada. Ve a Ajustes → TCultura para ingresar tu clave.',
                    'tcultura-connect'
                ),
            );
        }

        /* Try cache first */
        $cached = get_transient( TCULTURA_CACHE_KEY );
        if ( false !== $cached && is_array( $cached ) ) {
            return $this->apply_filters( $cached );
        }

        /* Fetch from API */
        $items = array();

        $show_events     = ! empty( $this->settings['show_events'] );
        $show_activities = ! empty( $this->settings['show_activities'] );

        if ( $show_events ) {
            $items = array_merge( $items, $this->fetch_paginated( TCULTURA_EP_EVENTOS ) );
        }

        if ( $show_activities ) {
            $items = array_merge( $items, $this->fetch_paginated( TCULTURA_EP_ACTIVIDADES ) );
        }

        /* Sort by date ascending */
        usort( $items, function ( $a, $b ) {
            return strtotime( $a['date_iso'] ?? '0' ) - strtotime( $b['date_iso'] ?? '0' );
        } );

        /* Store in cache */
        if ( ! empty( $items ) ) {
            set_transient( TCULTURA_CACHE_KEY, $items, TCULTURA_CACHE_TTL );
        }

        return $this->apply_filters( $items );
    }

    /* ── Public: test connection ────────────────────────────────────── */

    /**
     * Pings the /info/ endpoint and returns a status array.
     *
     * @return array{ success: bool, message: string, project_name?: string }
     */
    public function test_connection() {

        if ( '' === $this->api_key ) {
            return array(
                'success' => false,
                'message' => __( 'Ingresa tu API Key primero y guarda la configuración.', 'tcultura-connect' ),
            );
        }

        $url      = TCULTURA_API_BASE . TCULTURA_EP_INFO;
        $response = wp_remote_get( $url, array(
            'headers' => array(
                TCULTURA_API_HEADER => $this->api_key,
                'Accept'            => 'application/json',
            ),
            'timeout' => TCULTURA_API_TIMEOUT,
        ) );

        if ( is_wp_error( $response ) ) {
            return array(
                'success' => false,
                'message' => __( 'Error de conexión: ', 'tcultura-connect' ) . $response->get_error_message(),
            );
        }

        $code = wp_remote_retrieve_response_code( $response );

        if ( 200 !== $code ) {
            return array(
                'success' => false,
                /* translators: %d is the HTTP status code */
                'message' => sprintf( __( 'La API respondió con código HTTP %d. Verifica tu API Key.', 'tcultura-connect' ), $code ),
            );
        }

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $name = isset( $body['nombre'] ) ? $body['nombre'] : '';

        return array(
            'success'      => true,
            'message'      => $name
                /* translators: %s: The name of the project connected via API */
                ? sprintf( __( '✓ Conectado exitosamente al proyecto "%s".', 'tcultura-connect' ), $name )
                : __( '✓ Conexión exitosa con TCultura.', 'tcultura-connect' ),
            'project_name' => $name,
        );
    }

    /* ── Private helpers ────────────────────────────────────────────── */

    /**
     * Fetches all pages from a paginated endpoint.
     *
     * @param  string $endpoint  Relative endpoint (e.g. 'actividades/').
     * @return array             Flat array of result items.
     */
    private function fetch_paginated( $endpoint ) {

        $items    = array();
        $url      = TCULTURA_API_BASE . $endpoint;
        $page     = 1;
        $max_pages = 20; // safety limit

        while ( $url && $page <= $max_pages ) {
            $response = wp_remote_get( $url, array(
                'headers' => array(
                    TCULTURA_API_HEADER => $this->api_key,
                    'Accept'            => 'application/json',
                ),
                'timeout' => TCULTURA_API_TIMEOUT,
            ) );

            if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
                break;
            }

            $data = json_decode( wp_remote_retrieve_body( $response ), true );

            if ( isset( $data['results'] ) && is_array( $data['results'] ) ) {
                $items = array_merge( $items, $data['results'] );
            }

            /* Follow `next` URL for pagination; stop if absent or invalid */
            $url = ( isset( $data['next'] ) && ! empty( $data['next'] ) && esc_url_raw( $data['next'] ) ) ? $data['next'] : null;
            $page++;
        }

        return $items;
    }

    /**
     * Applies the date-range filter from settings.
     *
     * @param  array $items  Full sorted agenda.
     * @return array         Filtered agenda.
     */
    private function apply_filters( $items ) {

        if ( empty( $items ) ) {
            return $items;
        }

        $range_key = isset( $this->settings['date_range'] ) ? $this->settings['date_range'] : 'all';
        $ranges    = tcultura_get_date_ranges();

        if ( 'all' === $range_key || ! isset( $ranges[ $range_key ] ) ) {
            return $items;
        }

        $days     = (int) $ranges[ $range_key ]['days'];
        $now      = current_time( 'timestamp' );
        $max_time = $now + ( $days * DAY_IN_SECONDS );

        return array_values( array_filter( $items, function ( $item ) use ( $now, $max_time ) {
            $ts = strtotime( $item['date_iso'] ?? '' );
            return $ts && $ts >= $now && $ts <= $max_time;
        } ) );
    }
}
