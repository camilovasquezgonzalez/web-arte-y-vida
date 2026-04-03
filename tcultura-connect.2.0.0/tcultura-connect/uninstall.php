<?php
/**
 * Fired when the plugin is uninstalled (deleted from admin).
 *
 * @package TCultura_Connect
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

require_once dirname( __FILE__ ) . '/includes/config.php';

delete_option( TCULTURA_OPTION_KEY );
delete_transient( TCULTURA_CACHE_KEY );
