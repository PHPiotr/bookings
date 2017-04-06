module.exports = {

    'api_prefix': '/api/v1',
    'secret': 'my_secret_passphrase',
    'database': 'mongodb://localhost/phpiotr4',
    'token_expires_in': 1440,
    'token_key': 'BEARER_TOKEN',
    'event': {
        'auth_failed': 'auth_failed',
        'auth_success': 'auth_success',
        'token_received': 'token_received'
    },
    'max_per_page': 10,
    'cors': {
        'access_control_allow_headers': 'Authorization, Origin, X-Requested-With, Content-Type, Accept',
        'access_control_allow_origin': '*'
    }

};