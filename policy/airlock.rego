package triseal.airlock

default allow = false

allow {
    input.source_cell == "red_cell"
    input.destination == "airlock_relay"
    input.token.scope == "relay"
    input.token.expires_at_ns > input.current_time_ns
    count(input.raw_headers_retained) == 0
}
