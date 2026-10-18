# Grupo Conect — Site de horários e controle de viagens

Site estático feito com **HTML, CSS e JavaScript puro**, sem precisar instalar bibliotecas.

## Como abrir
1. Extraia o arquivo ZIP.
2. Abra `index.html` no navegador do celular ou computador.
3. Na tela inicial, escolha **Horários** ou **Calcular lucros de viagens**.

## Como adicionar as fotos dos horários
Na tela **Horários das linhas**, toque em **Escolher fotos** e selecione uma ou várias imagens. Elas aparecem automaticamente na galeria. As fotos ficam guardadas no armazenamento local do navegador (IndexedDB), no mesmo aparelho e navegador. Elas não são enviadas para um servidor. Se os dados do navegador forem apagados ou você trocar de aparelho/navegador, será preciso adicioná-las novamente.

No código, a tela e a galeria ficam em `index.html`, na seção `<!-- TELA DE HORÁRIOS -->`. O JavaScript para guardar, exibir e remover imagens fica no arquivo `script.js`.

## Como calcular o resultado de uma viagem
1. Informe o valor da passagem daquela linha.
2. Informe quantos litros de diesel foram gastos na viagem.
3. O preço do diesel começa em **R$ 7,36/L** e pode ser alterado no campo correspondente.
4. Use `+` e `−` para contar gratuidades e passageiros pagantes.
5. A prévia atualiza sozinha. Toque em **Finalizar viagem** para gerar o relatório e guardar o registro no histórico local.

### Fórmula usada
- **Arrecadação:** valor da passagem × número de passageiros pagantes.
- **Custo do diesel:** litros consumidos × preço do diesel por litro.
- **Resultado estimado:** arrecadação − custo do diesel.

O cálculo não inclui salário, manutenção, pedágio, impostos ou outras despesas que não foram informadas. Por isso, o resultado é uma estimativa antes dessas outras despesas — não necessariamente o lucro líquido real da operação.

## Arquivos
- `index.html` — estrutura e conteúdo das telas.
- `style.css` — cores, layout e adaptação para celular/computador.
- `script.js` — contadores, cálculos, relatórios, histórico e galeria de fotos.
