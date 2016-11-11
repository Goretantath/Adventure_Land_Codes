var auto_api_methods = [],
  base_url = window.location.protocol + "//" + window.location.host;
var sounds = {};
var draw_timeouts = [],
  timers = {},
  ping_sent = new Date(),
  modal_count = 0;

function is_hidden() {
  return document.hidden
}
var last_id_sent = "";

function send_target_logic() {
  if (ctarget && last_id_sent != ctarget.id) {
    last_id_sent = ctarget.id;
    socket.emit("target", {
      id: ctarget.id
    })
  }
  if (!ctarget && last_id_sent) {
    last_id_sent = "";
    socket.emit("target", {
      id: ""
    })
  }
}

function is_monster(a) {
  if (!a) {
    return
  }
  if (a.type == "monster") {
    return true
  }
}

function is_player(a) {
  if (!a) {
    return
  }
  if (a.type == "character" && !a.npc) {
    return true
  }
}

function is_character(a) {
  return is_player(a)
}

function cfocus(a) {
  var b = $(a);
  if (!$(a + ":focus").length) {
    b.focus()
  }
  b.html(b.html())
}

function ping() {
  ping_sent = new Date();
  socket.emit("ping_trig", {})
}

function ms_check(c, b, a) {
  if (c["ms_" + b] && mssince(c["ms_" + b]) < a) {
    return 0
  }
  c["ms_" + b] = new Date();
  return 1
}

function cached(d, c, b, a) {
  if (!window.GCACHED) {
    window.GCACHED = {}
  }
  if (b) {
    c += "|_" + b
  }
  if (a) {
    c += "|_" + a
  }
  if (GCACHED[d] == c) {
    return true
  }
  GCACHED[d] = c;
  return false
}

function disappearing_clone(b) {
  console.log("Disappearing clone added");
  var a = new PIXI.Sprite(b.texture);
  if (b.me) {
    a.x = b.real_x;
    a.y = b.real_y - 1;
    a.width = b.width / 2;
    a.height = b.height / 2
  } else {
    a.x = b.x;
    a.y = b.y - 1;
    a.width = b.width;
    a.height = b.height
  }
  a.displayGroup = b.displayGroup;
  a.anchor = b.anchor;
  a.alpha = 0.8;
  map.addChild(a);
  draw_timeout(fade_away(5, a), 15)
}

function fade_away(b, a) {
  return function() {
    if (b == 20 || is_hidden()) {
      destroy_sprite(a)
    } else {
      a.alpha -= 0.05;
      update_sprite(a);
      draw_timeout(fade_away(b + 1, a), 30, 1)
    }
  }
}

function hide_modal() {
  if (modal_count > 0) {
    modal_count--
  }
  $(".modal:last").remove()
}

function show_modal(f, a) {
  if (!a) {
    a = {}
  }
  if (!a.opacity) {
    a.opacity = 0.5
  }
  if (a.wrap === undefined) {
    a.wrap = true
  }
  var d = "";
  if (a.wrap) {
    d = "width: 600px; border: 5px solid gray; background: black;"
  }
  modal_count++;
  var b = "",
    c = "";
  c += "position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; z-index: 9000; text-align: center; vertical-align: middle; overflow-y: scroll; ";
  c += "background: rgba(0,0,0," + a.opacity + ")";
  b += "<div style='" + c + "' class='modal' onclick='stpr(event); hide_modal()'>";
  b += "<div style='display: inline-block; " + d + " margin-bottom: 100px; margin-top: 40px; padding: 10px; text-align: left; position: relative'";
  b += " onclick='stpr(event); return false' class='imodal'>";
  b += f;
  b += "</div>";
  b += "</div>";
  $("body").append(b);
  var g = $(".imodal:last").height();
  if (height > g) {
    $(".imodal:last").css("margin-bottom", "0px").css("margin-top", max(0, round(height / 2 - g / 2 - 5)))
  }
}

function position_modals() {
  $(".imodal").each(function() {
    var a = $(this),
      b = a.height();
    if (height > b) {
      a.css("margin-bottom", "0px").css("margin-top", max(0, round(height / 2 - b / 2 - 5)))
    } else {
      a.css("margin-bottom", "40px").css("margin-top", "100px")
    }
  })
}

function show_json(a) {
  if (!is_string(a)) {
    a = safe_stringify(a, 2)
  }
  show_modal("<div style='font-size: 24px;white-space: pre;' class='yesselect'>" + syntax_highlight(a) + "</div>")
}

function add_invite(a) {
  $(".pin" + a).remove();
  $("#chatlog").append("<div class='chatentry pin" + a + "' style='color: gray'><span style='color: white'>" + a + "</span> wants to party. 		<span class='clickable' style='color:green' onclick='socket.emit(\"party\",{event:\"accept\",name:\"" + a + "\"}); $(this).parent().remove()'>Accept</span></div>");
  $("#chatlog").scrollTop($("#chatlog")[0].scrollHeight);
  get_code_function("on_party_invite")(a)
}

function add_update_notes() {
  update_notes.forEach(function(b) {
    var a = "gray";
    if (b.indexOf("Merchant!") != -1) {
      a = "#60BED9"
    }
    add_log(b, a)
  })
}
var game_logs = [],
  game_chats = [];

function clear_game_logs() {
  game_logs = [];
  $("#gamelog").html("")
}

function add_log(c, a) {
  if (mode.dom_tests || inside == "payments") {
    return
  }
  if (game_logs.length > 1000) {
    var b = "<div class='gameentry' style='color: gray'>- Truncated -</div>";
    game_logs = game_logs.slice(-720);
    game_logs.forEach(function(d) {
      b += "<div class='gameentry' style='color: " + (d[1] || "white") + "'>" + d[0] + "</div>"
    });
    $("#gamelog").html(b)
  }
  game_logs.push([c, a]);
  $("#gamelog").append("<div class='gameentry' style='color: " + (a || "white") + "'>" + c + "</div>");
  $("#gamelog").scrollTop($("#gamelog")[0].scrollHeight)
}

function add_chat(b, g, d) {
  var a = "#chatlog",
    c = "";
  if (!window.character) {
    a = "#gamelog"
  }
  if (game_chats.length > 240) {
    var f = "<div class='chatentry' style='color: gray'>- Truncated -</div>";
    game_chats = game_chats.slice(-180);
    game_chats.forEach(function(h) {
      if (h[0]) {
        h[0] = "<span style='color:white'>" + h[0] + ":</span> "
      }
      f += "<div class='chatentry' style='color: " + (h[2] || "gray") + "'>" + (h[0] || "") + html_escape(h[1]) + "</div>"
    });
    $(a).html(f)
  }
  game_chats.push([b, g, d]);
  if (b) {
    c = "<span style='color:white'>" + b + ":</span> "
  }
  $(a).append("<div class='chatentry' style='color: " + (d || "gray") + "'>" + c + html_escape(g) + "</div>");
  $(a).scrollTop($(a)[0].scrollHeight)
}

function add_pmchat(g, a, d) {
  var f = "pm" + g,
    c = "";
  if (!in_arr(f, cwindows)) {
    open_chat_window("pm", g, a == character.name)
  }
  if (a != character.name && in_arr(f, docked)) {
    $("#chatt" + f).addClass("newmessage")
  }
  var b = "";
  b = "<span style='color:white'>" + a + ":</span> ";
  $("#chatd" + f).append("<div style='color: " + (c || "gray") + "'>" + b + html_escape(d) + "</div>");
  $("#chatd" + f).scrollTop($("#chatd" + f)[0].scrollHeight)
}

function add_partychat(a, d) {
  var f = "party",
    c = "";
  if (!in_arr(f, cwindows)) {
    open_chat_window("party", "", a == character.name)
  }
  if (a != character.name && in_arr(f, docked)) {
    $("#chatt" + f).addClass("newmessage")
  }
  var b = "";
  b = "<span style='color:white'>" + a + ":</span> ";
  $("#chatd" + f).append("<div style='color: " + (c || "gray") + "'>" + b + html_escape(d) + "</div>");
  $("#chatd" + f).scrollTop($("#chatd" + f)[0].scrollHeight)
}

function refresh_page() {
  window.location = window.location
}

function inventory_click(a) {
  if (character.items[a]) {
    render_item("#inventory-item", {
      id: "citem" + a,
      item: G.items[character.items[a].name],
      name: character.items[a].name,
      actual: character.items[a],
      num: a
    })
  }
}

function slot_click(a) {
  if (ctarget && ctarget.slots && ctarget.slots[a]) {
    dialogs_target = ctarget;
    render_item("#topleftcornerdialog", {
      id: "item" + a,
      item: G.items[ctarget.slots[a].name],
      name: ctarget.slots[a].name,
      actual: ctarget.slots[a],
      slot: a,
      from_player: ctarget.id
    })
  }
}

function party_click(a) {
  var b = null;
  if (a == character.name) {
    b = character
  }
  for (i in entities) {
    if (entities[i].type == "character" && entities[i].name == a) {
      b = entities[i]
    }
  }
  if (!b) {
    add_log(a + " isn't around", "gray");
    return
  }
  if (character.ctype == "priest") {
    player_heal.call(b)
  } else {
    ctarget = b
  }
}

function attack_click() {
  if (character.ctype == "priest" && ctarget && ctarget.type == "character") {
    player_heal.call(ctarget)
  } else {
    if (character.ctype == "priest") {
      player_heal.call(character)
    } else {
      if (ctarget && ctarget.type == "monster") {
        monster_attack.call(ctarget)
      }
    }
  }
}

function npc_focus() {
  var c = 102,
    a = null,
    b;
  if (!character) {
    return
  }
  map_npcs.forEach(function(d) {
    b = distance(d, character);
    if (b < c) {
      c = b, a = d
    }
  });
  map_doors.forEach(function(d) {
    b = distance(d, character);
    if (b < c) {
      c = b, a = d
    }
  });
  if (a) {
    a.onrclick()
  } else {
    add_log("Nothing nearby", "gray")
  }
}

function show_configure() {
  add_log("Coming soon: Settings, Sounds, Music", "gray");
  ping()
}

function list_soon() {
  add_log("Coming soon: Settings, Sounds, Music, PVP (in 1-2 weeks), Trade (Very Soon!)", "gray")
}

function transport_to(a, b) {
  if (a == "underworld") {
    add_log("Can't reach the underworld. Yet.", "gray");
    return
  }
  if (a == "desert") {
    add_log("Can't reach the desertland. Yet.", "gray");
    return
  }
  socket.emit("transport", {
    to: a,
    s: b
  })
}

function show_transports() {
  $("#rightcornerui").html($(".transports").html());
  topright_npc = "transports"
}

function hide_transports() {
  $("#rightcornerui").html("");
  topright_npc = false
}

function start_runner(a, b) {
  if (!a) {
    a = "maincode"
  }
  if (b === undefined) {
    b = codemirror_render.getValue()
  }
  the_code = b;
  $(".engagebutton").hide();
  $(".dengagebutton").show();
  $("#" + a).remove();
  $("body").append('<iframe src="/runner" height="60" width="120" id="' + a + '" style="position: fixed; bottom: 0px; right: 0px; z-index: 999; border: 5px solid gray"></iframe>');
  code_run = true
}

function stop_runner(a) {
  if (!a) {
    a = "maincode"
  }
  get_code_function("on_destroy")();
  code_run = code_active = false;
  $(".engagebutton").show();
  $(".dengagebutton").hide();
  $("#" + a).remove();
  socket.emit("code", {
    run: 0
  })
}

function toggle_runner() {
  if (code_run) {
    stop_runner()
  } else {
    start_runner()
  }
}

function code_logic() {
  window.codemirror_render = CodeMirror(function(a) {
    $("#code").replaceWith(a)
  }, {
    value: $("#dcode").val(),
    mode: "javascript",
    indentUnit: 4,
    indentWithTabs: true,
    lineWrapping: true,
    lineNumbers: true,
    gutters: ["CodeMirror-linenumbers", "lspacer"],
    theme: "pixel",
    cursorHeight: 0.75,
  })
}

function toggle_code() {
  if (code) {
    $("#codeui").hide();
    code = false
  } else {
    $("#codeui").show();
    code = true;
    codemirror_render.refresh()
  }
}

function start_timer(a) {
  timers[a] = new Date()
}

function stop_timer(b, a) {
  if (a) {
    a = "[" + a + "]"
  } else {
    a = ""
  }
  ms = mssince(timers[b]);
  if (b == "draw" && ms > 10 || b == "remove_sprite") {
    if (log_flags.timers) {
      console.log("timer[" + b + "]" + a + ": " + mssince(timers[b]))
    }
  }
  timers[b] = new Date()
}

function set_direction(a) {
  if (abs(a.angle) < 70) {
    a.direction = 2
  } else {
    if (abs(abs(a.angle) - 180) < 70) {
      a.direction = 1
    } else {
      if (abs(a.angle + 90) < 90) {
        a.direction = 3
      } else {
        a.direction = 0
      }
    }
  }
}

function direction_logic(a, b) {
  if (a.moving) {
    return
  }
  a.angle = Math.atan2(b.real_y - a.real_y, b.real_x - a.real_x) * 180 / Math.PI;
  set_direction(a)
}

function free_children(b) {
  if (!b.children) {
    return
  }
  for (var a = 0; a < b.children.length; a++) {
    b.children[a].parent = null
  }
}

function remove_sprite(a) {
  try {
    a.parent.removeChild(a)
  } catch (b) {
    console.log("Sprite is orphan, can't remove. Type: " + a.type)
  }
}

function destroy_sprite(a, c) {
  if (c != "just") {
    remove_sprite(a)
  }
  try {
    a.destroy()
  } catch (b) {
    console.log("Couldn't destroy sprite: " + a.type)
  }
}

function trade(c, a, b) {
  socket.emit("equip", {
    slot: c,
    num: a,
    value: ("" + b).replace_all(",", "").replace_all(".", "")
  });
  $("#topleftcornerdialog").html("")
}

function trade_buy(b, a) {
  socket.emit("trade_buy", {
    slot: b,
    id: a
  });
  $("#topleftcornerdialog").html("")
}

function buy(a, b) {
  if (mssince(last_npc_right_click) < 100) {
    return
  }
  var c = "buy";
  if (G.items[a].cash) {
    c = "buy_with_cash"
  }
  socket.emit(c, {
    name: a,
    quantity: b
  });
  $(".buynum").html($(".buynum").data("q"))
}

function sell(a, b) {
  if (!b) {
    b = 1
  }
  socket.emit("sell", {
    num: a,
    quantity: b
  });
  $(".sellnum").html((parseInt($(".sellnum").data("q")) - b) + "");
  $(".sellnum").data("q", $(".sellnum").html())
}

function get_code_function(a) {
  return code_active && document.getElementById("maincode") && document.getElementById("maincode").contentWindow && document.getElementById("maincode").contentWindow[a] || (function() {})
}

function private_say(a, c, b) {
  socket.emit("say", {
    message: c,
    code: b,
    name: a
  })
}

function party_say(b, a) {
  socket.emit("say", {
    message: b,
    code: a,
    party: true
  })
}
var last_say = "normal";

function say(g, f) {
  if (!g || !g.length) {
    return
  }
  last_say = "normal";
  if (g[0] == "/") {
    g = g.substr(1, 2000);
    var d = g.split(" "),
      h = d.shift(),
      c = d.join(" ");
    if (h == "help" || h == "list" || h == "") {
      add_chat("", "/list");
      add_chat("", "/party");
      add_chat("", "/whisper");
      add_chat("", "/p");
      add_chat("", "/guide");
      add_chat("", "/ping");
      add_chat("", "/savecode /loadcode /runcode")
    } else {
      if (h == "p") {
        party_say(c)
      } else {
        if (h == "w") {
          var b = c.split(" "),
            a = b.shift(),
            c = b.join(" ");
          if (!a || !c) {
            add_chat("", "Format: /w NAME MESSAGE")
          } else {
            private_say(a, c)
          }
        } else {
          if (h == "savecode") {
            var b = c.split(" "),
              j = b.shift(),
              a = b.join(" ");
            if (j.length && !parseInt(j)) {
              add_chat("", "/savecode NUMBER NAME");
              add_chat("", "NUMBER can be from 1 to 100")
            } else {
              if (!j) {
                j = 1
              }
              api_call("save_code", {
                code: codemirror_render.getValue(),
                slot: j,
                name: a
              })
            }
          } else {
            if (h == "loadcode" || h == "runcode") {
              var b = c.split(" "),
                a = b.shift();
              if (!a) {
                a = 1
              }
              api_call("load_code", {
                name: a,
                run: (h == "runcode" && "1" || "")
              })
            } else {
              if (h == "ping") {
                ping()
              } else {
                if (h == "whisper") {
                  if (ctarget && !ctarget.me && !ctarget.npc && ctarget.type == "character") {
                    private_say(ctarget.name, c)
                  } else {
                    add_chat("", "Target someone to whisper")
                  }
                } else {
                  if (h == "party" || h == "invite") {
                    var b = c.split(" "),
                      a = b.shift();
                    if (a && a.length) {
                      socket.emit("party", {
                        event: "invite",
                        name: a
                      })
                    } else {
                      if (ctarget && !ctarget.me && !ctarget.npc && ctarget.type == "character") {
                        socket.emit("party", {
                          event: "invite",
                          id: ctarget.id
                        })
                      } else {
                        add_chat("", "Target someone to invite")
                      }
                    }
                  } else {
                    if (h == "guide") {
                      show_modal($("#gameguide").html())
                    } else {
                      if (code_active && document.getElementById("maincode") && document.getElementById("maincode").contentWindow && document.getElementById("maincode").contentWindow.handle_command) {
                        if (document.getElementById("maincode").contentWindow.handle_command(h, c) != -1) {} else {
                          add_chat("", "Command not found. You can add a `handle_command` function to your CODE to capture commands.")
                        }
                      } else {
                        add_chat("", "Command not found. Suggestion: /list")
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } else {
    socket.emit("say", {
      message: g,
      code: f
    })
  }
}

function stone(a, b) {
  socket.emit("stone", {
    num: a,
    action: b
  })
}

function open_merchant(a) {
  socket.emit("merchant", {
    num: a
  })
}

function close_merchant() {
  socket.emit("merchant", {
    close: 1
  })
}

function upgrade() {
  if (u_item == null || u_scroll == null) {
    d_text("INVALID", character)
  } else {
    socket.emit("upgrade", {
      item_num: u_item,
      scroll_num: u_scroll,
      offering_num: u_offering,
      clevel: (character.items[u_item].level || 0)
    })
  }
}

function deposit(a) {
  if (!G.maps[current_map].mount) {
    add_log("Not in the bank.", "gray");
    return
  }
  if (!a) {
    a = $(".npcgold").html() || ""
  }
  a = a.replace_all(",", "").replace_all(".", "");
  socket.emit("bank", {
    operation: "deposit",
    amount: parseInt(a)
  })
}

function withdraw(a) {
  if (!G.maps[current_map].mount) {
    add_log("Not in the bank.", "gray");
    return
  }
  if (!a) {
    a = $(".npcgold").html() || ""
  }
  a = a.replace_all(",", "").replace_all(".", "");
  socket.emit("bank", {
    operation: "withdraw",
    amount: parseInt(a)
  })
}
var exchange_animations = false,
  last_excanim = new Date(),
  exclast = 0;
var exccolors = ["#f1c40f", "#f39c12", "#e74c3c", "#c0392b", "#8e44ad", "#9b59b6", "#2980b9", "#3498db", "#1abc9c"];

function exchange_animation_logic() {
  if (mssince(last_excanim) > 300) {
    last_excanim = new Date();
    $("#eitem").children().css("border-color", exccolors[exclast % exccolors.length]);
    $(".ering3").css("border-color", exccolors[(exclast + 1) % exccolors.length]);
    $(".ering2").css("border-color", exccolors[(exclast + 2) % exccolors.length]);
    $(".ering1").css("border-color", exccolors[(exclast + 3) % exccolors.length]);
    exclast++
  }
}

function exchange() {
  function a(b, c) {
    return function() {
      socket.emit("exchange", {
        item_num: b,
        q: c
      })
    }
  }
  if (e_item == null) {
    d_text("INVALID", character)
  } else {
    if (exchange_animations) {
      d_text("WAIT FOR IT", character)
    } else {
      exchange_animations = true;
      draw_timeout(a(e_item, character.items[e_item].q), 3000)
    }
  }
}

function compound() {
  if (c_last != 3 || c_scroll == null) {
    d_text("INVALID", character)
  } else {
    socket.emit("compound", {
      items: c_items,
      scroll_num: c_scroll,
      offering_num: c_offering,
      clevel: (character.items[c_items[0]].level || 0)
    })
  }
}

function esc_pressed() {
  if (modal_count > 0) {
    hide_modal()
  } else {
    if (code) {
      toggle_code()
    } else {
      if (topright_npc) {
        $("#rightcornerui").html("");
        topright_npc = false
      } else {
        if (topleft_npc) {
          topleft_npc = false
        } else {
          if (ctarget && ctarget.type == "character") {
            ctarget = null
          } else {
            if (inventory) {
              draw_trigger(render_inventory)
            } else {
              if (skillsui) {
                draw_trigger(render_skills)
              }
            }
          }
        }
      }
    }
  }
}

function toggle_stats() {
  if (topright_npc != "character") {
    render_character_sheet()
  } else {
    $("#rightcornerui").html("");
    topright_npc = false
  }
}

function toggle_character() {
  if (ctarget == character && !topleft_npc) {
    ctarget = null
  } else {
    topleft_npc = false, ctarget = character
  }
}

function reset_inventory(a) {
  if (inventory) {
    if (a && !in_arr(rendered_target, ["upgrade", "compound", "exchange", "npc", "merchant"])) {
      return
    }
    render_inventory(), render_inventory()
  }
}

function generate_textures(b, l) {
  console.log("generate_textures " + b + " " + l);
  if (l == "full") {
    var k = D[b],
      c = k[2],
      o = k[3],
      q = 0,
      p = 0;
    var n = G.actual_dimensions[b];
    if (n) {
      c = n[0];
      o = n[1];
      q = round((k[2] - c) / 2 + (n[2] || 0));
      p = round(k[3] - o + (n[3] || 0))
    }
    textures[b] = [
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null]
    ];
    for (var h = 0; h < 3; h++) {
      for (var f = 0; f < 4; f++) {
        var m = new PIXI.Rectangle(k[0] + h * k[2] + q, k[1] + f * k[3] + p, c, o);
        if (offset_walking && !n) {
          m.y += 2, m.height -= 2
        }
        textures[b][h][f] = new PIXI.Texture(C[FC[b]], m)
      }
    }
  }
  if (l == "animation") {
    var n = G.animations[b];
    var c = PIXI.utils.BaseTextureCache[n.file].width,
      g = Math.floor(c / n.frames);
    var o = PIXI.utils.BaseTextureCache[n.file].height;
    textures[b] = e_array(n.frames);
    for (var h = 0; h < n.frames; h++) {
      var m = new PIXI.Rectangle(0 + g * h, 0, g, o);
      textures[b][h] = new PIXI.Texture(PIXI.utils.BaseTextureCache[n.file], m)
    }
  }
  if (l == "emote") {
    var k = D[b];
    textures[b] = [null, null, null];
    for (var h = 0; h < 3; h++) {
      var m = new PIXI.Rectangle(k[0] + h * k[2], k[1], k[2], k[3]);
      textures[b][h] = new PIXI.Texture(C[FC[b]], m)
    }
  }
}

function set_texture(d, b, a) {
  var f = b + "" + a;
  if (d.cskin == f) {
    return
  }
  if (d.stype == "full") {
    d.texture = textures[d.skin][b][a]
  }
  if (d.stype == "animation") {
    d.texture = textures[d.skin][b % d.frames]
  }
  if (d.stype == "emote") {
    d.texture = textures[d.skin][b % 3]
  }
  d.cskin = f
}

function new_sprite(h, b, j) {
  if (b == "full") {
    if (!textures[h]) {
      generate_textures(h, "full")
    }
    var f = new PIXI.Sprite(textures[h][1][0]);
    f.cskin = "10"
  }
  if (b == "animation") {
    if (!textures[h]) {
      generate_textures(h, "animation")
    }
    var f = new PIXI.Sprite(textures[h][0]);
    f.cskin = "0" + undefined;
    f.frame = 0;
    f.frames = textures[h].length
  }
  if (b == "emote") {
    if (!textures[h]) {
      generate_textures(h, "emote")
    }
    var f = new PIXI.Sprite(textures[h][0]);
    f.cskin = "0" + undefined;
    f.frame = 0
  }
  if (b == "static") {
    var a = G.positions[h],
      d = G.tilesets[a[0]];
    var c = new PIXI.Rectangle(a[1], a[2], a[3], a[4]);
    var g = new PIXI.Texture(PIXI.utils.BaseTextureCache[d], c);
    var f = new PIXI.Sprite(g);
    f.cskin = undefined + "" + undefined
  }
  f.skin = h;
  f.stype = b;
  f.updates = 0;
  return f
}

function recreate_dtextures() {
  (window.dtextures || []).forEach(function(c) {
    if (c) {
      c.destroy()
    }
  });
  dtile_width = max(width, screen.width);
  dtile_height = max(height, screen.height);
  for (var b = 0; b < 3; b++) {
    var a = new PIXI.extras.TilingSprite(M["default"][5 + b] || M["default"][5], dtile_width / scale + 3 * dtile_size, dtile_height / scale + 3 * dtile_size);
    dtextures[b] = PIXI.RenderTexture.create(dtile_width + 4 * dtile_size, dtile_height + 4 * dtile_size, PIXI.SCALE_MODES.NEAREST, 1);
    renderer.render(a, dtextures[b]);
    a.destroy()
  }
  console.log("recreated dtextures");
  if (dtile) {
    dtile.texture = dtextures[water_frame()]
  }
}

function water_frame() {
  return [0, 1, 2, 1][round(draws / 30) % 4]
}

function new_map_tile(b) {
  total_map_tiles++;
  if (b.length == 8) {
    var a = new PIXI.Sprite(b[5]);
    a.textures = [b[5], b[6], b[7]];
    return a
  }
  return new PIXI.Sprite(b[5])
}

function assassin_smoke(a, d) {
  var b = new_sprite("explode_p", "animation");
  b.displayGroup = player_layer;
  b.x = round(a);
  b.y = round(d);
  b.real_x = a;
  b.real_y = d + 1;
  b.width = 16;
  b.height = 16;
  b.anchor.set(0.5, 1);
  map.addChild(b);

  function c(f) {
    return function() {
      if (f >= 12) {
        destroy_sprite(b)
      } else {
        b.y -= 3;
        b.height += 1;
        b.width += 1;
        b.frame++;
        set_texture(b, b.frame);
        draw_timeout(c(f + 1), 40)
      }
    }
  }
  draw_timeout(c(1), 40)
}

function start_animation(d, c, g) {
  if (d.animations[c]) {
    d.animations[c].frame = 0;
    return
  }
  var b = new_sprite(c, "animation"),
    f = (d.awidth || d.width),
    a = (d.aheight || d.height);
  d.animations[c] = b;
  if (G.animations[c].alpha) {
    b.alpha = G.animations[c].alpha
  } else {
    b.alpha = 0.5
  }
  if (g == "stun") {
    b.continuous = true;
    b.width = round(f * 2 / 3);
    b.height = round(a / 3);
    b.y = -a + 8
  }
  if (c == "transport" || c == "invincible") {
    b.continuous = true;
    b.height = round(a * 0.95)
  } else {
    if (G.animations[c].proportional) {
      if (1 * b.height * f / b.width > a) {
        b.height = a;
        b.width = ceil(1 * b.width * a / b.height)
      } else {
        b.height = ceil(1 * b.height * f / b.width);
        b.width = d.width
      }
    } else {
      if (G.animations[c].size) {
        b.width = round(f * G.animations[c].size);
        b.height = round(a * G.animations[c].size)
      } else {
        b.width = f;
        b.height = a
      }
    }
  }
  b.aspeed = G.animations[c].aspeed;
  b.anchor.set(0.5, 1);
  d.addChild(b)
}

function stop_animation(b, a) {
  var d = b.animations[a];
  if (!d) {
    return
  }
  var c = d.parent;
  if (!c) {
    return
  }
  destroy_sprite(d);
  delete c.animations[a]
}

function set_base_rectangle(b) {
  var a = b.texture.frame;
  b.base_rectangle = new PIXI.Rectangle(a.x, a.y, a.width, a.height)
}

function dirty_fix(a) {
  return;
  var b = a.texture.frame;
  a.texture = new PIXI.Rectangle(b.x, b.y + 8, b.width, b.height)
}

function restore_base(b) {
  var a = b.base_rectangle;
  b.texture.frame = new PIXI.Rectangle(a.x, a.y, a.width, a.height)
}

function rotate(l, g) {
  var m = PIXI.GroupD8,
    j = l.texture;
  var d = m.isSwapWidthHeight(g) ? j.frame.width : j.frame.height;
  var k = m.isSwapWidthHeight(g) ? j.frame.height : j.frame.width;
  var a = j.frame;
  var f = new PIXI.Rectangle(0, 0, k, d);
  var b = f;
  if (g % 2 == 0) {
    var c = new PIXI.Texture(j.baseTexture, a, f, b, g)
  } else {
    var c = new PIXI.Texture(j.baseTexture, a, f, b, g - 1);
    c.rotate++
  }
  l.texture = c
}

function rotated_texture(j, a, g) {
  if (!g) {
    return new PIXI.Texture(j, a)
  }
  var l = PIXI.GroupD8;
  var d = l.isSwapWidthHeight(g) ? a.width : a.height;
  var k = l.isSwapWidthHeight(g) ? a.height : a.width;
  var f = new PIXI.Rectangle(0, 0, k, d);
  var b = f;
  if (g % 2 == 0) {
    var c = new PIXI.Texture(j, a, f, b, g)
  } else {
    var c = new PIXI.Texture(j, a, f, b, g - 1);
    c.rotate++
  }
  return c
}

function drag_logic() {}

function draw_timeouts_logic(f) {
  var g = new Date(),
    a = [];
  for (var b = 0; b < draw_timeouts.length; b++) {
    var c = draw_timeouts[b];
    if (f && f == 2 && c[2] != 2) {
      continue
    }
    if (g >= c[1]) {
      a.push(b);
      try {
        c[0]()
      } catch (d) {
        console.log("draw_timeout_error: " + d)
      }
    }
  }
  if (a) {
    delete_indices(draw_timeouts, a)
  }
}

function draw_timeout(c, b, a) {
  draw_timeouts.push([c, future_ms(b), a])
}

function draw_trigger(a) {
  draw_timeouts.push([a, new Date(), 2])
}

function tint_logic() {
  var c = new Date(),
    s = [];
  for (var h = 0; h < tints.length; h++) {
    var d = tints[h],
      a = 240,
      j = 95,
      p = 0,
      f = 50,
      n = 205,
      l = 50;
    if (d.type == "skill") {
      if (c > d.end) {
        $(d.selector).parent().find("img").css("opacity", 1);
        s.push(h);
        $(d.selector).css("height", "0px").css("background-color", "rgb(" + a + "," + j + "," + p + ")")
      } else {
        if (!d.added) {
          d.added = true;
          $(d.selector).css("height", "1px")
        }
        var m = mssince(d.start),
          q = -mssince(d.end);
        var t = 2 * 46 * m / (m + q + 1),
          k = m / (m + q + 1);
        $(d.selector).css("background-color", "rgb(" + round(a + (f - a) * k) + "," + round(j + (n - j) * k) + "," + round(p + (l - p) * k) + ")");
        $(d.selector).css({
          "-webkit-transform": "scaleY(" + t + ")",
          "-moz-transform": "scaleY(" + t + ")",
          "-ms-transform": "scaleY(" + t + ")",
          "-o-transform": "scaleY(" + t + ")",
          transform: "scaleY(" + t + ")",
        })
      }
    } else {
      if (d.type == "dissipate") {
        if (c > d.end) {
          $(d.selector).parent().css("background", "black");
          s.push(h)
        } else {
          var a = d.r,
            j = d.g,
            p = d.b,
            o = 20;
          if (d.i < o) {
            a = round(a - (a / 2 / o) * d.i);
            j = round(j - (j / 2 / o) * d.i);
            p = round(p - (p / 2 / o) * d.i);
            if (d.i == o - 1) {
              d.mid = new Date()
            }
          } else {
            var m = mssince(d.mid),
              q = -mssince(d.end);
            var k = min(1, max(0, 1 * m / (m + q + 1)));
            a = round((1 - k) * a / 2);
            j = round((1 - k) * j / 2);
            p = round((1 - k) * p / 2)
          }
          $(d.selector).parent().css("background", "rgb(" + a + "," + p + "," + p + ")")
        }
        d.i++
      } else {
        if (d.type == "brute") {
          if (c > d.end) {
            if (tint_c[d.key] == d.cur) {
              $(d.selector).children(".thetint").remove();
              $(d.selector).css("background", d.reset_to)
            }
            s.push(h)
          } else {
            if (tint_c[d.key] != d.cur) {
              continue
            }
            if (!d.added) {
              d.added = true;
              $(d.selector).append("<div style='position: absolute; " + (d.pos || "bottom") + ": 0px; left: 0px; right: 0px; height: 1px; background: " + d.color + "; z-index: 0' class='thetint'></div>")
            }
            var m = mssince(d.start),
              q = -mssince(d.end);
            var t = 60.1 * m / (m + q + 1);
            $(d.selector).children(".thetint").css({
              "-webkit-transform": "scaleY(" + t + ")",
              "-moz-transform": "scaleY(" + t + ")",
              "-ms-transform": "scaleY(" + t + ")",
              "-o-transform": "scaleY(" + t + ")",
              transform: "scaleY(" + t + ")",
            })
          }
        } else {
          if (d.type == "fill") {
            if (c > d.end) {
              d.type = "glow";
              $(d.selector).css("background", d.reset_to);
              if (d.on_end) {
                d.on_end()
              }
              s.push(h)
            } else {
              var m = mssince(d.start),
                q = -mssince(d.end);
              var u = round(100 * m / (m + q + 1));
              if (d.reverse) {
                u = 100 - u
              }
              u = max(1, u);
              $(d.selector).css("background", "-webkit-gradient(linear, " + d.start_d + ", " + d.end_d + ", from(" + d.color + "), to(" + d.back_to + "), color-stop(" + (u - 1) + "%," + d.color + "),color-stop(" + u + "%, " + d.back_to + ")")
            }
          } else {
            if (d.type == "glow") {} else {
              if (d.type == "half") {
                $(d.selector).css("background", "-webkit-gradient(linear, left top, right top, from(#f0f), to(#0f0), color-stop(49%,#f0f),color-stop(50%, #0f0)")
              }
            }
          }
        }
      }
    }
  }
  if (s) {
    delete_indices(tints, s)
  }
}

function add_tint(a, b) {
  if (mode.dom_tests) {
    return
  }
  if (!b) {
    b = {}
  }
  if (!b.color) {
    b.color = "#999787"
  }
  if (!b.ms) {
    b.ms = 1000
  }
  if (!b.type) {
    b.type = "fill"
  }
  if (!b.back_to) {
    b.back_to = "black"
  }
  if (!b.reset_to) {
    b.reset_to = b.back_to
  }
  if (!b.start_d) {
    b.start_d = "left bottom"
  }
  if (!b.end_d) {
    b.end_d = "left top"
  }
  b.selector = a;
  b.start = new Date();
  b.end = new Date();
  b.end.setMilliseconds(b.end.getMilliseconds() + b.ms);
  tints.push(b)
}

function use(c) {
  var a = false;
  for (var b = character.items.length - 1; b >= 0; b--) {
    var f = character.items[b];
    if (!f) {
      continue
    }
    if (a) {
      break
    }
    var d = G.items[f.name];
    (d.gives || []).forEach(function(g) {
      if (g[0] == c) {
        socket.emit("equip", {
          num: b
        });
        a = 1
      }
    })
  }
  if (!a) {
    socket.emit("use", {
      item: c
    })
  }
}
var tint_c = {
  a: 0,
  p: 0,
  t: 0
};

function attack_timeout(a) {
  next_attack = future_ms(a);
  draw_trigger(function() {
    $(".atint").css("background", "none");
    tint_c.a++;
    add_tint(".atint", {
      ms: -mssince(next_attack),
      color: "#4C4C4C",
      reset_to: "#6A6A6A",
      type: "brute",
      key: "a",
      cur: tint_c.a
    })
  })
}

function pot_timeout(a) {
  next_potion = future_ms(a);
  draw_trigger(function() {
    $(".ptint").css("background", "none");
    tint_c.p++;
    add_tint(".ptint", {
      ms: -mssince(next_potion),
      color: "#4C4C4C",
      reset_to: "#6A6A6A",
      type: "brute",
      key: "p",
      cur: tint_c.p
    })
  });
  skill_timeout("use_hp", a);
  skill_timeout("use_mp", a)
}

function pvp_timeout(a) {
  next_transport = future_ms(a);
  draw_trigger(function() {
    $(".pvptint").parent().css("background", "rgb(200,50,20)");
    for (var d = 1; d < 10; d++) {
      var h = 200 - d * 15,
        f = 50 - d * 3,
        c = 20 - d;
      draw_timeout(function(l, k, j) {
        return function() {
          $(".pvptint").parent().css("background", "rgb(" + l + "," + k + "," + j + ")")
        }
      }(h, f, c), d * 600)
    }
    0 && draw_timeout(function() {
      $(".pvptint").parent().css("background", "black");
      $(".pvptint").css("background", "#907B81");
      tint_c.t++;
      add_tint(".pvptint", {
        ms: -mssince(next_transport),
        color: "black",
        reset_to: "none",
        type: "brute",
        key: "t",
        cur: tint_c.t,
        pos: "top"
      })
    }, 200)
  })
}

function pvp_timeout(c, h) {
  var f = 200,
    d = 50,
    a = 20;
  if (h == "sneak") {
    f = 45, d = 111, a = 45
  }
  next_transport = future_ms(c);
  draw_trigger(function() {
    $(".pvptint").parent().css("background", "rgb(" + f + "," + d + "," + a + ")");
    tint_c.t++;
    add_tint(".pvptint", {
      ms: -mssince(next_transport),
      r: f,
      g: d,
      b: a,
      type: "dissipate",
      key: "t",
      cur: tint_c.t,
      i: 0
    })
  })
}
var next_skill = {};

function skill_timeout(b, a) {
  var c = "";
  next_skill[b] = future_ms(a);
  for (N in skillmap) {
    if (skillmap[N] && (skillmap[N].name == b || skillmap[N].name == "skill_" + b)) {
      c = N
    }
  }
  draw_trigger(function() {
    $(".skidloader" + c).parent().find("img").css("opacity", 0.5);
    add_tint(".skidloader" + c, {
      ms: -mssince(next_skill[b]),
      type: "skill"
    })
  })
}

function empty_rect(b, g, f, a, d, c) {
  if (!c) {
    c = 8940599
  }
  if (!d) {
    d = 1
  }
  if (!f) {
    f = 1
  }
  if (!a) {
    a = 1
  }
  e = new PIXI.Graphics();
  e.lineStyle(d, c);
  e.drawPolygon([b, g, b, g + a, b + f, g + a, b + f, g, b, g]);
  return e
}

function draw_line(a, g, c, f, d, b) {
  if (!b) {
    b = 16720693
  }
  if (!d) {
    d = 1
  }
  e = new PIXI.Graphics();
  e.lineStyle(d, b);
  e.moveTo(a, g);
  e.lineTo(c, f);
  e.endFill();
  return e
}

function draw_circle(a, d, c, b) {
  if (!b) {
    b = 16720693
  }
  if (!c) {
    c = 1
  }
  e = new PIXI.Graphics();
  e.beginFill(b);
  e.drawCircle(a, d, c);
  e.endFill();
  return e
}

function add_border(b, c, a) {
  if (!c) {
    c = (b.awidth || b.width), a = (b.aheight || b.height)
  }
  e = new PIXI.Graphics();
  e.lineStyle(1, 8940599);
  e.drawRect(0, 0, c, a);
  if (b.anchor) {
    e.x = -b.anchor.x * c;
    e.y = -b.anchor.y * a
  }
  b.aborder = e;
  b.addChild(e)
}

function player_rclick_logic(a) {
  if (!character || a.me) {
    return
  }
  var b = false;
  if (a.npc) {
    b = true
  } else {
    if (character.ctype == "priest") {
      b = true
    } else {
      if (!pvp || character.party && a.party == character.party) {} else {
        if (pvp) {
          b = true
        }
      }
    }
  }
  if (b && !a.on_rclick) {
    a.on_rclick = true;
    a.on("rightdown", player_right_click)
  } else {
    if (!b && a.on_rclick) {
      a.on_rclick = false;
      a.removeListener("rightdown")
    }
  }
}

function border_logic(a) {
  if (a.aborder) {
    destroy_sprite(a.aborder);
    a.aborder = null
  }
  add_border(a)
}

function rip_logic() {
  if (character.rip && !rip) {
    if (code_run) {
      if (document.getElementById("maincode") && document.getElementById("maincode").contentWindow && document.getElementById("maincode").contentWindow.handle_death) {
        var c = false;
        try {
          if (document.getElementById("maincode").contentWindow.handle_death() != -1) {
            c = true
          }
        } catch (b) {
          add_log(b + " on handle_death", "#E13758")
        }
        if (!c) {
          stop_runner("maincode")
        }
      } else {
        stop_runner("maincode")
      }
    }
    rip = true;
    var a = new PIXI.filters.ColorMatrixFilter();
    a.desaturate();
    stage.filters = [a];
    character.moving = false;
    $("#ripbutton").show()
  }
  if (!character.rip && rip) {
    rip = false;
    stage.filters = null;
    $("#ripbutton").hide()
  }
}

function name_logic(a) {
  if (a.type != "character") {
    return
  }
  if (!n_pressed && a.name_tag) {
    destroy_sprite(a.name_tag);
    a.name_tag = null
  } else {
    if (n_pressed && !a.name_tag) {
      add_name_tag(a)
    }
  }
}

function add_name_tag(d) {
  if (d.name_tag) {
    destroy_sprite(d.name_tag);
    d.name_tag = null
  }
  var h = new PIXI.Graphics(),
    c = "Lv." + d.level + " " + d.name,
    f = c.length * 4 + 4,
    a = 11,
    g = 1;
  h.beginFill(7433580);
  h.drawRect(0, 0, f, a);
  h.endFill();
  h.beginFill(2105119);
  h.drawRect(1, 1, f - 2, a - 2);
  h.endFill();
  h.position = new PIXI.Point(-round(f / 2), 2);
  d.addChild(h);
  if (!d.me) {
    g = 4
  } else {
    g = 8
  }
  var b = {
    fontFamily: S.font,
    fontSize: 64 * g,
    fill: "white",
    align: "center"
  };
  var c = new PIXI.Text(c, b);
  c.x = (f / 2);
  c.y = 2.5;
  c.anchor.set(0.5, 0);
  c.scale = new PIXI.Point(0.125 / g, 0.125 / g);
  h.addChild(c);
  d.name_tag = h;
  d.addChild(h)
}

function add_name_tag_large(d) {
  if (d.name_tag) {
    destroy_sprite(d.name_tag);
    d.name_tag = null
  }
  var h = new PIXI.Graphics(),
    c = "Lv." + d.level + " " + d.name,
    f = c.length * 7 + 6,
    a = 21,
    g = 1;
  h.beginFill(7433580);
  h.drawRect(0, 0, f, a);
  h.endFill();
  h.beginFill(2105119);
  h.drawRect(2, 2, f - 4, a - 4);
  h.endFill();
  h.position = new PIXI.Point(-round(f / 2), 2);
  d.addChild(h);
  if (!d.me) {
    g = 4
  } else {
    g = 8
  }
  var b = {
    fontFamily: S.font,
    fontSize: 64 * g,
    fill: "white",
    align: "center"
  };
  var c = new PIXI.Text(c, b);
  c.x = (f / 2);
  c.y = 4;
  c.anchor.set(0.5, 0);
  c.scale = new PIXI.Point(0.25 / g, 0.25 / g);
  h.addChild(c);
  d.name_tag = h;
  d.addChild(h)
}

function add_name_tag_experimental(d) {
  if (d.name_tag) {
    destroy_sprite(d.name_tag);
    d.name_tag = null
  }
  var h = new PIXI.Graphics(),
    c = "Lv." + d.level + " " + d.name,
    f = c.length * 7 + 6,
    a = 21,
    g = 1;
  h.beginFill(7433580);
  h.drawRect(0, 0, f, a);
  h.endFill();
  h.beginFill(2105119);
  h.drawRect(2, 2, f - 4, a - 4);
  h.endFill();
  h.position = new PIXI.Point(-round(f / 2), -a - (d.aheight || d.height));
  d.addChild(h);
  if (!d.me) {
    g = 4
  } else {
    g = 8
  }
  var b = {
    fontFamily: S.font,
    fontSize: 64 * g,
    fill: "white",
    align: "center"
  };
  var c = new PIXI.Text(c, b);
  c.x = (f / 2);
  c.y = 4;
  c.anchor.set(0.5, 0);
  c.scale = new PIXI.Point(0.25 / g, 0.25 / g);
  h.addChild(c);
  d.name_tag = h;
  d.addChild(h)
}

function hp_bar_logic(a) {
  if (a.dead && !a.hp_bar) {
    return
  }
  if (!hp_bars || a.me) {
    return
  }
  if (ctarget == a || (character && character.party && character.party == a.party) || (character && character.party && a.target && in_arr(a.target, party_list))) {
    add_hp_bar(a)
  } else {
    if (a.hp_bar) {
      destroy_sprite(a.hp_bar);
      a.hp_bar = null
    }
  }
}

function add_hp_bar(c) {
  var f = max(32, round(c.width * 0.8)),
    h = 1,
    g = round(2 * h);
  if (c.hp_bar) {
    if (c.hp_width == round((f - round(2 * (h + 1))) * c.hp / c.max_hp)) {
      return
    }
    destroy_sprite(c.hp_bar);
    c.hp_bar = null
  }
  c.hp_width = round((f - round(2 * (h + 1))) * c.hp / c.max_hp);
  var d = new PIXI.Graphics();
  d.beginFill(7433580);
  d.drawRect(0, 0, f, 6 + g);
  d.endFill();
  d.beginFill(2105119);
  d.drawRect(h, h, f - g, 6);
  d.endFill();
  if (c.npc) {
    color = 14717952
  } else {
    if (c.type == "character" && !pvp && !is_pvp && ctarget == c) {
      color = 3574827
    } else {
      if (character && character.party && character.party == c.party) {
        color = 7290759
      } else {
        color = 11609895
      }
    }
  }
  d.beginFill(color);
  d.drawRect(h + 1, h + 1, c.hp_width, 4);
  d.endFill();
  var a = 12,
    b = 0;
  if (c.type == "character" && character_names) {
    a += 8
  }
  if (c.mscale == 2) {
    a += 6, b += f / 2
  }
  d.position = new PIXI.Point(-(f / 2) - b, -a - (c.aheight || c.height) + (c.mscale == 2 && -4 || 0));
  if (c.mscale) {
    d.scale = new PIXI.Point(c.mscale, c.mscale)
  }
  c.hp_bar = d;
  c.addChild(d)
}

function test_bitmap(a, d, b) {
  var c = new PIXI.BitmapText("YAY BITMAPS!", {
    font: b + "px m5x7",
    align: "center"
  });
  c.displayGroup = text_layer;
  c.x = round(a);
  c.y = round(d);
  map.addChild(c)
}

function d_line(d, a, b) {
  if (!d_lines) {
    return
  }
  if (!b) {
    b = {}
  }
  if (!b.color || b.color == "attack") {
    b.color = 9964288
  } else {
    if (b.color == "heal") {
      b.color = 14714259
    } else {
      if (b.color == "taunt") {
        b.color = 7368816
      } else {
        if (b.color == "burst") {
          b.color = 4362158, b.size = 3
        } else {
          if (b.color == "supershot") {
            b.color = 10164014, b.size = 2
          } else {
            if (b.color == "curse") {
              b.color = 8211882, b.size = 2
            } else {
              if (b.color == "my_hit") {
                b.color = 2919973
              }
            }
          }
        }
      }
    }
  }
  e = new PIXI.Graphics();
  e.lineStyle(b.size || 1, b.color);
  e.moveTo(gx(d), gy(d) - 2);
  e.lineTo(gx(a), gy(a) - 2);
  e.endFill();
  map.addChild(e);

  function c(g, f) {
    return function() {
      f.alpha -= 0.08;
      if (g < 10) {
        draw_timeout(c(g + 1, f), 20)
      } else {
        remove_sprite(f);
        try {
          f.destroy()
        } catch (h) {}
      }
    }
  }
  draw_timeout(c(0, e), 20)
}

function d_text(n, j, h, g) {
  if (mode.dom_tests_pixi) {
    return
  }
  if (is_object(j)) {
    var l = j;
    g = h;
    j = l.real_x || l.x;
    h = (l.real_y || l.y) - (l.aheight || l.height) - (l.hp_bar && 15 || 2);
    if (l.mscale == 2) {
      h += 14
    }
  }
  if (!g) {
    g = {}
  }
  var b = g.color || "#4C4C4C";
  if (b == "hp") {
    b = "green"
  } else {
    if (b == "mp") {
      b = "#317188"
    } else {
      if (b == "damage") {
        b = "#C80000"
      } else {
        if (b == "+gold") {
          b = "gold"
        } else {
          if (b == "stun") {
            b = "#FF9601", h -= 12
          } else {
            if (b == "sneak") {
              b = "#2D9B41", h -= 12
            } else {
              if (b == "supershot") {
                b = "#9B172E", h -= 12
              } else {
                if (b == "burst") {
                  b = "#2A8A9A", o = "large"
                }
              }
            }
          }
        }
      }
    }
  }
  var o = S[g.size] || g.size || S.normal;
  var k = g.parent || window.map;
  var a = !g.dont_animate;
  var c = 1000;
  var m = new PIXI.Text(n, {
    fontFamily: S.font,
    fontSize: o * text_quality,
    fontWeight: "bold",
    fill: b,
    align: "center"
  });
  m.displayGroup = text_layer;
  m.x = round(j);
  m.y = round(h);
  m.type = "text";
  m.alpha = 1;
  m.last_fade = new Date();
  m.anchor.set(0.5, 1);
  if (text_quality > 1) {
    m.scale = new PIXI.Point(1 / text_quality, 1 / text_quality)
  }
  k.addChild(m);

  function d(p, q) {
    return function() {
      var r = mssince(q.last_fade),
        t = round(4 * r / 100);
      if (2 < t && t < 7) {
        t = 4
      }
      q.y -= t;
      q.alpha = max(0, q.alpha - (0.078 * r / 100));
      q.last_fade = new Date();
      if (q.alpha > 0.25) {
        draw_timeout(d(p + 1, q), 100)
      } else {
        remove_sprite(q);
        try {
          q.destroy({
            texture: true,
            baseTexture: true
          })
        } catch (s) {}
      }
    }
  }

  function f(p, q) {
    return function() {
      q.position.y -= 4;
      q.alpha -= 0.08;
      if (p < 10) {
        draw_timeout(d(p + 1, q), 100)
      } else {
        remove_sprite(q);
        try {
          q.destroy({
            texture: true,
            baseTexture: true
          })
        } catch (r) {}
      }
    }
  }
  draw_timeout(d(0, m), 100);
  if (g.s) {
    sfx(g.s)
  }
}

function api_call(h, c, g) {
  if (!c) {
    c = {}
  }
  if (!g) {
    g = {}
  }
  var d = "/api/" + h,
    b = g.disable;
  if (c.ui_loader) {
    g.r_id = randomStr(10);
    delete c.ui_loader
  }
  if (c.callback) {
    g.callback = c.callback;
    delete c.callback
  }
  if (b) {
    b.addClass("disable")
  }
  data = {
    method: h,
    "arguments": JSON.stringify(c)
  };

  function f(k, j) {
    return function(l) {
      if (k.r_id) {
        hide_loader(k.r_id)
      }
      if (k.callback) {
        k.callback.apply(this, [l])
      } else {
        handle_information(l)
      }
      if (k.success) {
        smart_eval(k.success)
      }
      if (j) {
        j.removeClass("disable")
      }
    }
  }

  function a(k, j) {
    return function(l) {
      if (k.r_id) {
        hide_loader(k.r_id)
      }
      if (k.silent || in_arr(h, auto_api_methods)) {
        return
      }
      ui_error("An Unknown Error");
      if (j) {
        j.removeClass("disable")
      }
    }
  }
  if (g.r_id) {
    show_loader(g.r_id)
  }
  call_args = {
    type: "POST",
    dataType: "json",
    url: base_url + d,
    data: data,
    success: f(g, b),
    error: a(g, b)
  };
  $.ajax(call_args)
}

function api_call_l(c, a, b) {
  if (!a) {
    a = {}
  }
  a.ui_loader = true;
  return api_call(c, a, b)
}
var warned = {};

function pvp_warning(a) {
  if (is_pvp && (a == "start" || a == "welcome")) {
    add_log("This is a PVP Server. Be careful!", "#E1664C")
  }
  if (a == "map" && !is_pvp && G.maps[current_map].pvp && !warned[current_map]) {
    warned[current_map] = 1, add_log("This is a PVP Zone. Be careful!", "#E1664C")
  }
}

function ui_log(a, b) {
  add_log(a, b)
}

function ui_error(a) {
  add_log(a, "red")
}

function ui_success(a) {
  add_log(a, "green")
}

function handle_information(b) {
  for (var a = 0; a < b.length; a++) {
    info = b[a];
    if (in_arr(info.type, ["ui_log", "message"])) {
      if (info.color) {
        add_log(info.message, info.color)
      } else {
        ui_log(info.message)
      }
    }
    if (info.type == "code") {
      codemirror_render.setValue(info.code);
      if (info.run) {
        if (code_run) {
          toggle_runner(), toggle_runner()
        } else {
          toggle_runner()
        }
      }
    }
    if (info.type == "chat_message") {
      add_chat("", info.message, info.color)
    }
    if (in_arr(info.type, ["ui_error", "error"])) {
      ui_error(info.message)
    }
    if (in_arr(info.type, ["success"])) {
      ui_success(info.message)
    } else {
      if (info.type == "content") {
        $("#content").html(info.html);
        resize()
      } else {
        if (info.type == "eval") {
          smart_eval(info.code)
        } else {
          if (info.type == "func") {
            smart_eval(window[info.func], info.args)
          } else {
            if (info.type == "pcs") {
              pcs(info.sound)
            }
          }
        }
      }
    }
  }
}

function add_alert(a) {
  console.log("caught exception: " + a);
  if (is_sdk) {
    alert(a)
  }
}

function sfx(a) {
  try {
    if (!sound_sfx) {
      return
    }
    if (a == "hit" || a == "monster_hit") {
      sounds.hit_8bit.play()
    }
    if (a == "explosion") {
      sounds.fx_explosion.play()
    }
    if (a == "coins") {
      sounds.coin_collect.play()
    }
    if (a == "hp" || a == "mp") {
      sounds.use_8bit.play()
    }
    if (a == "chat") {
      sounds.chat.play()
    }
  } catch (b) {
    add_alert(b)
  }
}

function pcs(a) {
  if (!sound_sfx) {
    return
  }
  if (!a || a == 0) {
    if (sounds.click) {
      sounds.click.play()
    }
  }
  if (a == "success" && sounds.success) {
    sounds.success.play()
  }
}

function init_sounds() {
  sounds.click = new Howl({
    src: ["/sounds/effects/click_natural.wav"],
    volume: 0.5,
  });
  if (sound_sfx) {
    init_fx()
  }
  if (sound_music) {
    init_music()
  }
}

function init_fx() {
  if (window.fx_init) {
    return
  }
  window.fx_init = 1;
  sounds.fx_explosion = new Howl({
    src: ["/sounds/fx/EXPLOSION_Short_Kickback_Crackle_stereo.wav"],
    volume: 0.4,
  });
  sounds.coin_collect = new Howl({
    src: ["/sounds/fx/COINS_Rattle_03_mono.wav"],
    volume: 0.4,
  });
  sounds.hit_8bit = new Howl({
    src: ["/sounds/fx/8BIT_RETRO_Hit_Bump_Noise_mono.wav"],
    volume: 0.4,
  });
  sounds.magic_8bit = new Howl({
    src: ["/sounds/fx/8BIT_RETRO_Fire_Blaster_Short_mono.wav"],
    volume: 0.4,
  });
  sounds.use_8bit = new Howl({
    src: ["/sounds/fx/VideoGameSFX_blip_07.wav"],
    volume: 0.4,
  });
  sounds.chat = new Howl({
    src: ["/sounds/fx/UI_Beep_Double_Quick_Smooth_stereo.wav"],
    volume: 0.4,
  })
}

function init_music() {
  if (window.music_init) {
    return
  }
  window.music_init = 1;
  sounds.horror01 = new Howl({
    src: ["/sounds/loops/horror_01_loop.ogg", "/sounds/loops/horror_01_loop.wav"],
    volume: 0.4,
    autoplay: false,
    loop: true,
  });
  sounds.rpg08 = new Howl({
    src: ["/sounds/loops/rpg_08_loop.ogg", "/sounds/loops/rpg_08_loop.wav"],
    volume: 0.4,
    autoplay: false,
    loop: true,
  })
}
var current_music = null;

function reflect_music() {
  var a = sounds.rpg08;
  if (!sound_music) {
    if (current_music) {
      current_music.stop()
    }
    current_music = null;
    return
  }
  if (current_map == "batcave" || current_map == "halloween") {
    a = sounds.horror01
  }
  if (current_music != a) {
    if (current_music) {
      current_music.stop()
    }
    current_music = a;
    a.play()
  }
}

function bc(a, b) {
  var c = $(a);
  if (c.hasClass("disabled")) {
    return 1
  }
  pcs(b);
  return 0
}

function btc(b, a) {
  stpr(b);
  pcs(a)
}

function show_loader() {}

function hide_loader() {}

function alert_json(a) {
  alert(JSON.stringify(a))
}

function game_stringify(d, b) {
  var a = [];
  try {
    return JSON.stringify(d, function(f, g) {
      if (in_arr(f, ["transform", "parent", "displayGroup", "vertexData", "animations", "tiles", "placements", "default", "children"]) || f.indexOf("filter_") != -1 || f[0] == "_") {
        return
      }
      if (g != null && typeof g == "object") {
        if (a.indexOf(g) >= 0) {
          return
        }
        a.push(g)
      }
      return g
    }, b)
  } catch (c) {
    return "safe_stringify_exception"
  }
}

function syntax_highlight(a) {
  a = a.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return a.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(c) {
    var b = "shnumber";
    if (/^"/.test(c)) {
      if (/:$/.test(c)) {
        b = "shkey"
      } else {
        b = "shstring"
      }
    } else {
      if (/true|false/.test(c)) {
        b = "shboolean"
      } else {
        if (/null/.test(c)) {
          b = "shnull"
        }
      }
    }
    return '<span class="' + b + '">' + c + "</span>"
  })
}
jQuery.fn.all_html = function() {
  return jQuery("<div />").append(this.eq(0).clone()).html()
};
jQuery.fn.rval = function(a) {
  var b = jQuery(this);
  var c = b.val();
  if (a == undefined) {
    a = ""
  }
  b.val(a);
  return c
};
jQuery.fn.rfval = function(a) {
  var b = jQuery(this).rval(a);
  $(":focus").blur();
  return b
};

function stpr(a) {
  try {
    if (a == "manual") {
      return
    }
    a.stopPropagation()
  } catch (b) {}
};