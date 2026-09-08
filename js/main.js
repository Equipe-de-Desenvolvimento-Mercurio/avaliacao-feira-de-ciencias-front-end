(function () {
    "use strict";

    var routes = {
        dashboard: "Pagina-principal.html",
        projetos: "Criar-projeto.html",
        professores: "Pagina-professor.html",
        rank: "ranking.html",
        avaliadores: "pagina-avaliadores.html",
        voltar: "Pagina-principal.html",
        inicio: "home.html",
        avaliacoes: "projetos-avaliar.html",
        perfil: "login.html"
    };

    function normalize(value) {
        return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function routeFor(label) {
        var key = normalize(label).replace(/[^a-z]/g, "");
        return routes[key];
    }

    document.querySelectorAll("#navegador .btn, footer .inicio, footer .projetos, footer .avaliaçoes, footer .perfil").forEach(function (control) {
        var destination = routeFor(control.textContent);
        if (!destination) return;

        if (control.closest("footer") && (control.classList.contains("projetos") || control.classList.contains("avaliaçoes"))) {
            destination = "projetos-avaliar.html";
        }

        control.type = "button";
        control.addEventListener("click", function () {
            window.location.href = destination;
        });

        if (destination === window.location.pathname.split("/").pop()) {
            control.setAttribute("aria-current", "page");
        }
    });

    document.querySelectorAll("a[href^=\"http://127.0.0.1\"]").forEach(function (link) {
        link.href = "Pagina-principal.html";
    });

    document.querySelectorAll("a[href=\"#\"]").forEach(function (link) {
        var label = normalize(link.textContent);
        link.href = label.indexOf("professor") !== -1 ? "Pagina-professor.html" : "Visualizar-projeto.html";
    });

    document.querySelectorAll(".avaliar button").forEach(function (control) {
        control.addEventListener("click", function () {
            window.location.href = "formulario.html";
        });
    });

    document.querySelectorAll(".enviar button").forEach(function (control) {
        control.addEventListener("click", function () {
            if (window.SICApi && window.SICApi.isConfigured()) {
                var form = control.closest("main");
                var scores = {};
                form.querySelectorAll('input[type="radio"]:checked').forEach(function (input) {
                    scores[input.name] = Number(input.value);
                });

                if (["criatividade", "metodologia", "relevancia", "apresentacao", "nota5", "nota6"].some(function (criterion) {
                    return typeof scores[criterion] !== "number";
                })) {
                    window.alert("Selecione uma nota para todos os critérios.");
                    return;
                }

                control.disabled = true;
                window.SICApi.evaluations.submit({
                    id_projeto: Number(form.dataset.projectId),
                    nota1: scores.criatividade,
                    nota2: scores.metodologia,
                    nota3: scores.relevancia,
                    nota4: scores.apresentacao,
                    nota5: scores.nota5,
                    nota6: scores.nota6,
                    comentario: form.querySelector("#observacoes").value
                }).then(function () {
                    window.location.href = "avaliacao-enviada.html";
                }).catch(function (error) {
                    control.disabled = false;
                    window.alert(error.message);
                });
                return;
            }

            window.location.href = "avaliacao-enviada.html";
        });
    });

    document.querySelectorAll(".Ver, #btn-prof").forEach(function (control) {
        control.type = "button";
        control.addEventListener("click", function () {
            window.location.href = control.id === "btn-prof" ? "registrar-novo-professor.html" : "projetos-avaliar.html";
        });
    });

    document.querySelectorAll("form").forEach(function (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (form.closest(".login-card") && window.SICApi && window.SICApi.isConfigured()) {
                var submit = form.querySelector("button[type=submit]");
                submit.disabled = true;
                window.SICApi.auth.login({
                    email: form.querySelector("#email").value,
                    password: form.querySelector("#senha").value
                }).then(function (session) {
                    var role = session && session.user && (session.user.tipo_usuario || session.user.role);
                    if (role === "professor") {
                        window.location.href = "home.html";
                    } else if (role === "coordenador") {
                        window.location.href = "Pagina-principal.html";
                    } else {
                        throw new Error("O tipo de usuário retornado pela API é inválido.");
                    }
                }).catch(function (error) {
                    submit.disabled = false;
                    window.alert(error.message);
                });
                return;
            }

            var target = form.closest(".login-card") ? "home.html" :
                (window.location.pathname.toLowerCase().indexOf("registrar") !== -1 ? "Pagina-professor.html" : "Visualizar-projeto.html");
            window.location.href = target;
        });
    });
}());