function resolver() {
  const tipo = document.getElementById('tipo').value;
  const objetivoTexto = document.getElementById('objetivo').value;
  const restricoesTexto = document.getElementById('restricoes').value;
  const output = document.getElementById('resultado');
  output.innerHTML = "⏳ Resolvendo...";

  try {
    const glpk = GLPK();

    // Extrair variáveis e coeficientes da função objetivo
    const variaveis = [];
    const objetivo = [];
    const regexVar = /([+-]?\s*\d*\.?\d*)x(\d+)/g;
    let match;
    while ((match = regexVar.exec(objetivoTexto))) {
      const coef = parseFloat(match[1].replace(/\s/g, "")) || 1;
      const idx = parseInt(match[2]);
      variaveis[idx - 1] = `x${idx}`;
      objetivo[idx - 1] = coef;
    }

    // Montar restrições
    const restricoes = restricoesTexto.trim().split("\n").map(linha => linha.trim());
    const subjectTo = restricoes.map(r => {
      const partes = r.match(/([<>]=|=)/);
      const tipo = partes ? partes[0] : "<=";
      const ladoEsq = r.split(tipo)[0];
      const ladoDir = parseFloat(r.split(tipo)[1]);
      const coefs = [];
      let m;
      const reg = /([+-]?\s*\d*\.?\d*)x(\d+)/g;
      while ((m = reg.exec(ladoEsq))) {
        const coef = parseFloat(m[1].replace(/\s/g, "")) || 1;
        const idx = parseInt(m[2]);
        coefs[idx - 1] = coef;
      }
      return { tipo, ladoDir, coefs };
    });

    // Criar modelo GLPK
    const modelo = {
      name: "modeloPL",
      objective: {
        direction: tipo === "max" ? glpk.GLP_MAX : glpk.GLP_MIN,
        name: "obj",
        vars: variaveis.map((v, i) => ({ name: v, coef: objetivo[i] || 0 }))
      },
      subjectTo: subjectTo.map((r, i) => ({
        name: "restricao" + (i + 1),
        vars: variaveis.map((v, j) => ({ name: v, coef: r.coefs[j] || 0 })),
        bnds:
          r.tipo === "<=" ? { type: glpk.GLP_UP, ub: r.ladoDir } :
          r.tipo === ">=" ? { type: glpk.GLP_LO, lb: r.ladoDir } :
                            { type: glpk.GLP_FX, lb: r.ladoDir, ub: r.ladoDir }
      }))
    };

    // Resolver o modelo
    const resultado = glpk.solve(modelo);

    // Mostrar resultados
    let texto = `<b>Status:</b> ${resultado.result.status}<br>`;
    texto += `<b>Valor ótimo (Z):</b> ${resultado.result.z.toFixed(2)}<br><br>`;
    texto += `<b>Variáveis:</b><br>`;
    for (let v in resultado.result.vars) {
      texto += `${v} = ${resultado.result.vars[v].toFixed(2)}<br>`;
    }
    output.innerHTML = texto;

  } catch (e) {
    output.innerHTML = `<b style='color:red;'>Erro ao resolver:</b> ${e.message}`;
  }
}
