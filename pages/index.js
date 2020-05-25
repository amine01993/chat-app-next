
export default function Home({name}) {
  return (
    <div>
      Hello { name }
    </div>
  )
}

Home.getInitialProps = async (props) => {
  return {
    name: props.query.name
  }
};